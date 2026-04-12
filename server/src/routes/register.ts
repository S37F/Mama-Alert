import { Router } from 'express'
import { z } from 'zod'
import { asyncHandler } from '@/lib/asyncHandler'
import { logAudit, logError } from '@/lib/logger'
import { signSosPatientToken } from '@/lib/sosToken'
import { requireAdmin, requireAuth } from '@/middleware/auth'
import {
  insertHospitalWithLocation,
  insertPatientWithLocation,
  insertVolunteerWithLocation,
} from '@/services/db/geoWrites'

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

function parseDateOnly(s: string | null | undefined): Date | null {
  if (s === undefined || s === null || s === '') {
    return null
  }
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
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
    try {
      const data = await insertPatientWithLocation({
        healthWorkerId: hwId,
        zoneId,
        name: body.name,
        age: body.age ?? null,
        phonePrimary: body.phone_primary.trim(),
        phoneSecondary: body.phone_secondary?.trim() ?? null,
        village: body.village ?? null,
        landmark: body.landmark ?? null,
        lat: body.lat,
        lng: body.lng,
        weeksPregnant: body.weeks_pregnant ?? null,
        dueDate: parseDateOnly(body.due_date),
        prevPregnancies: body.prev_pregnancies ?? null,
        prevBirths: body.prev_births ?? null,
        prevCsection: body.prev_csection ?? false,
        lastAncDate: parseDateOnly(body.last_anc_date),
        bloodType: body.blood_type ?? null,
        language: body.language,
        riskFlags: body.risk_flags ?? [],
        medicationName: body.medication_name ?? null,
        emergencyContacts: body.emergency_contacts ?? [],
      })
      const sos_token = signSosPatientToken(data.id, SOS_TOKEN_TTL_SEC)
      logAudit('patient_registered', { patientId: data.id, healthWorkerId: hwId })
      res.status(201).json({ id: data.id, status_token: data.status_token, sos_token })
    } catch (error) {
      logError('register patient failed', { error: String(error) })
      res.status(400).json({ error: 'Could not register patient', details: String(error) })
    }
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
    try {
      const data = await insertVolunteerWithLocation({
        zoneId: targetZone,
        name: body.name,
        phone: body.phone.trim(),
        lat: body.lat,
        lng: body.lng,
        skills: body.skills ?? [],
        vehicle: body.vehicle ?? 'none',
        maxRadiusKm: body.max_radius_km ?? 5,
        language: body.language ?? 'en',
      })
      logAudit('volunteer_registered', { volunteerId: data.id, zoneId: targetZone })
      res.status(201).json({ id: data.id })
    } catch (error) {
      logError('register volunteer failed', { error: String(error) })
      res.status(400).json({ error: 'Could not register volunteer', details: String(error) })
    }
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
    try {
      const data = await insertHospitalWithLocation({
        zoneId: targetZone,
        name: body.name,
        type: body.type ?? 'PHC',
        lat: body.lat,
        lng: body.lng,
        phoneMain: body.phone_main ?? null,
        phoneEmergency: body.phone_emergency ?? null,
        services: body.services ?? [],
        is24hr: body.is_24hr ?? false,
        receiveAlerts: body.receive_alerts ?? true,
      })
      logAudit('hospital_registered', { hospitalId: data.id, zoneId: targetZone })
      res.status(201).json({ id: data.id })
    } catch (error) {
      logError('register hospital failed', { error: String(error) })
      res.status(400).json({ error: 'Could not register hospital', details: String(error) })
    }
  }),
)
