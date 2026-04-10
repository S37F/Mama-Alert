import { Router } from 'express'
import { z } from 'zod'
import { asyncHandler } from '@/lib/asyncHandler'
import { logAudit, logError } from '@/lib/logger'
import { signSosPatientToken } from '@/lib/sosToken'
import { requireAdmin, requireAuth } from '@/middleware/auth'
import { supabaseAdmin } from '@/services/supabase'

export const registerRouter = Router()

const relationshipEnum = z.enum(['husband', 'mother', 'sister', 'neighbour', 'other'])

const emergencyContactSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(8),
  relationship: relationshipEnum,
})

const patientSchema = z.object({
  name: z.string().min(1),
  age: z.number().int().min(1).max(120).optional().nullable(),
  phone_primary: z.string().min(8).max(20).regex(/^\+?[0-9]{8,20}$/),
  phone_secondary: z.string().max(20).optional().nullable(),
  village: z.string().optional().nullable(),
  landmark: z.string().optional().nullable(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  weeks_pregnant: z.number().int().min(1).max(44).optional().nullable(),
  due_date: z.string().optional().nullable(),
  prev_pregnancies: z.number().int().min(0).optional().nullable(),
  prev_births: z.number().int().min(0).optional().nullable(),
  prev_csection: z.boolean().optional(),
  last_anc_date: z.string().optional().nullable(),
  blood_type: z.string().max(8).optional().nullable(),
  language: z.string().min(2).max(8),
  zone_id: z.string().uuid().optional().nullable(),
  risk_flags: z.array(z.string()).optional(),
  medication_name: z.string().optional().nullable(),
  emergency_contacts: z.array(emergencyContactSchema).optional(),
})

const volunteerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(8).max(20),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  skills: z.array(z.string()).optional(),
  vehicle: z.enum(['none', 'motorcycle', 'car', 'ambulance']).optional(),
  max_radius_km: z.number().int().min(1).max(100).optional(),
  language: z.string().min(2).max(8).optional(),
  zone_id: z.string().uuid().optional().nullable(),
})

const hospitalSchema = z.object({
  name: z.string().min(1),
  type: z.string().max(32).optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  phone_main: z.string().max(32).optional().nullable(),
  phone_emergency: z.string().max(32).optional().nullable(),
  services: z.array(z.string()).optional(),
  is_24hr: z.boolean().optional(),
  receive_alerts: z.boolean().optional(),
  zone_id: z.string().uuid().optional().nullable(),
})

function geographyPointWkt(lng: number, lat: number): string {
  return `SRID=4326;POINT(${lng} ${lat})`
}

/** SOS link token TTL (seconds) — ~6 months. */
const SOS_TOKEN_TTL_SEC = 180 * 24 * 60 * 60

registerRouter.post(
  '/patient',
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = patientSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() })
      return
    }
    const body = parsed.data
    const hwId = req.authUserId
    if (!hwId) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }
    const zoneId =
      req.healthWorker?.access_level === 'admin'
        ? (body.zone_id ?? req.healthWorker.zone_id ?? null)
        : (req.healthWorker?.zone_id ?? null)
    const { data, error } = await supabaseAdmin
      .from('patients')
      .insert({
        health_worker_id: hwId,
        zone_id: zoneId,
        name: body.name,
        age: body.age ?? null,
        phone_primary: body.phone_primary.trim(),
        phone_secondary: body.phone_secondary?.trim() ?? null,
        village: body.village ?? null,
        landmark: body.landmark ?? null,
        location: geographyPointWkt(body.lng, body.lat),
        weeks_pregnant: body.weeks_pregnant ?? null,
        due_date: body.due_date ?? null,
        prev_pregnancies: body.prev_pregnancies ?? null,
        prev_births: body.prev_births ?? null,
        prev_csection: body.prev_csection ?? false,
        last_anc_date: body.last_anc_date ?? null,
        blood_type: body.blood_type ?? null,
        language: body.language,
        risk_flags: body.risk_flags ?? [],
        medication_name: body.medication_name ?? null,
        emergency_contacts: body.emergency_contacts ?? [],
      })
      .select('id, status_token')
      .single()

    if (error) {
      logError('register patient failed', { error: String(error) })
      res.status(400).json({ error: 'Could not register patient', details: error.message })
      return
    }
    const sos_token = signSosPatientToken(data.id, SOS_TOKEN_TTL_SEC)
    logAudit('patient_registered', { patientId: data.id, healthWorkerId: hwId })
    res.status(201).json({ id: data.id, status_token: data.status_token, sos_token })
  }),
)

registerRouter.post(
  '/volunteer',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const parsed = volunteerSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() })
      return
    }
    const body = parsed.data
    const adminZone = req.healthWorker?.zone_id ?? null
    const targetZone = body.zone_id ?? adminZone
    if (!targetZone) {
      res.status(400).json({ error: 'zone_id is required for volunteer registration' })
      return
    }
    if (adminZone && body.zone_id && body.zone_id !== adminZone) {
      res.status(403).json({ error: 'Cannot register volunteer outside your zone' })
      return
    }
    const { data, error } = await supabaseAdmin
      .from('volunteers')
      .insert({
        name: body.name,
        phone: body.phone.trim(),
        location: geographyPointWkt(body.lng, body.lat),
        skills: body.skills ?? [],
        vehicle: body.vehicle ?? 'none',
        max_radius_km: body.max_radius_km ?? 5,
        language: body.language ?? 'en',
        zone_id: targetZone,
      })
      .select('id')
      .single()

    if (error) {
      logError('register volunteer failed', { error: String(error) })
      res.status(400).json({ error: 'Could not register volunteer', details: error.message })
      return
    }
    logAudit('volunteer_registered', { volunteerId: data.id, zoneId: targetZone })
    res.status(201).json({ id: data.id })
  }),
)

registerRouter.post(
  '/hospital',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const parsed = hospitalSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() })
      return
    }
    const body = parsed.data
    const adminZone = req.healthWorker?.zone_id ?? null
    const targetZone = body.zone_id ?? adminZone
    if (!targetZone) {
      res.status(400).json({ error: 'zone_id is required for hospital registration' })
      return
    }
    if (adminZone && body.zone_id && body.zone_id !== adminZone) {
      res.status(403).json({ error: 'Cannot register hospital outside your zone' })
      return
    }
    const { data, error } = await supabaseAdmin
      .from('hospitals')
      .insert({
        name: body.name,
        type: body.type ?? 'PHC',
        location: geographyPointWkt(body.lng, body.lat),
        phone_main: body.phone_main ?? null,
        phone_emergency: body.phone_emergency ?? null,
        services: body.services ?? [],
        is_24hr: body.is_24hr ?? false,
        receive_alerts: body.receive_alerts ?? true,
        zone_id: targetZone,
      })
      .select('id')
      .single()

    if (error) {
      logError('register hospital failed', { error: String(error) })
      res.status(400).json({ error: 'Could not register hospital', details: error.message })
      return
    }
    logAudit('hospital_registered', { hospitalId: data.id, zoneId: targetZone })
    res.status(201).json({ id: data.id })
  }),
)
