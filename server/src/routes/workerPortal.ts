import { Router } from 'express'
import { z } from 'zod'
import { asyncHandler } from '@/lib/asyncHandler'
import { logError } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireHealthWorker } from '@/middleware/auth'
import { updatePatientForHealthWorker } from '@/services/db/geoWrites'

const relationshipEnum = z.enum(['husband', 'mother', 'sister', 'neighbour', 'other'])
const emergencyContactSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(8),
  relationship: relationshipEnum,
})

const patchPatientSchema = z
  .object({
    name: z.string().min(1).optional(),
    village: z.string().min(1).optional().nullable(),
    weeks_pregnant: z.number().int().min(1).max(44).optional().nullable(),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
    risk_flags: z.array(z.string()).optional(),
    emergency_contacts: z.array(emergencyContactSchema).min(1).max(4).optional(),
    complete_profile: z.boolean().optional(),
  })
  .superRefine((val, ctx) => {
    const hasLat = val.lat !== undefined
    const hasLng = val.lng !== undefined
    if (hasLat !== hasLng) {
      ctx.addIssue({ code: 'custom', message: 'lat and lng must be provided together', path: ['lng'] })
    }
    if (val.complete_profile && (!val.emergency_contacts || val.emergency_contacts.length < 1)) {
      ctx.addIssue({
        code: 'custom',
        message: 'At least one emergency contact is required to complete the profile',
        path: ['emergency_contacts'],
      })
    }
    if (val.complete_profile && (!val.village || val.village.trim().length < 1)) {
      ctx.addIssue({ code: 'custom', message: 'Village is required to complete the profile', path: ['village'] })
    }
  })

export const workerPortalRouter = Router()

workerPortalRouter.use(requireAuth)
workerPortalRouter.use(requireHealthWorker)

workerPortalRouter.get(
  '/patients',
  asyncHandler(async (req, res) => {
    const uid = req.authUserId
    if (!uid) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    try {
      const data = await prisma.patient.findMany({
        where: { healthWorkerId: uid },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          weeksPregnant: true,
          riskFlags: true,
          lastAncDate: true,
          phonePrimary: true,
          village: true,
          registrationVerified: true,
          registrationSource: true,
        },
      })

      const rows = data.map((row) => {
        const lastAnc = row.lastAncDate ? row.lastAncDate.toISOString().slice(0, 10) : null
        let overdueAnc = false
        if (lastAnc) {
          const d = new Date(lastAnc)
          const days = (Date.now() - d.getTime()) / (24 * 60 * 60 * 1000)
          overdueAnc = days > 28
        }
        return {
          id: row.id,
          name: row.name,
          weeksPregnant: row.weeksPregnant,
          riskFlags: row.riskFlags,
          lastAncDate: lastAnc,
          overdueAnc,
          phonePrimary: row.phonePrimary,
          village: row.village,
          registrationVerified: row.registrationVerified,
          registrationSource: row.registrationSource,
        }
      })

      res.json({ patients: rows })
    } catch (err) {
      logError('worker patients failed', { error: String(err) })
      res.status(500).json({ error: 'Failed to load patients' })
    }
  }),
)

workerPortalRouter.patch(
  '/patients/:id',
  asyncHandler(async (req, res) => {
    const uid = req.authUserId
    if (!uid) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }
    const patientId = req.params.id
    if (!patientId) {
      res.status(400).json({ error: 'Missing patient id' })
      return
    }
    const parsed = patchPatientSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() })
      return
    }
    const body = parsed.data

    try {
      const payload: Parameters<typeof updatePatientForHealthWorker>[0] = {
        patientId,
        healthWorkerId: uid,
      }
      if (body.name !== undefined) {
        payload.name = body.name
      }
      if (body.village !== undefined) {
        payload.village = body.village
      }
      if (body.weeks_pregnant !== undefined) {
        payload.weeksPregnant = body.weeks_pregnant
      }
      if (body.risk_flags !== undefined) {
        payload.riskFlags = body.risk_flags
      }
      if (body.emergency_contacts !== undefined) {
        payload.emergencyContacts = body.emergency_contacts
      }
      if (body.lat !== undefined && body.lng !== undefined) {
        payload.lat = body.lat
        payload.lng = body.lng
      }
      if (body.complete_profile) {
        payload.registrationVerified = true
      }
      await updatePatientForHealthWorker(payload)
      res.json({ ok: true })
    } catch (err) {
      const code =
        err && typeof err === 'object' && 'statusCode' in err ? (err as { statusCode: number }).statusCode : 500
      if (code === 404) {
        res.status(404).json({ error: 'Patient not found' })
        return
      }
      logError('worker patch patient failed', { error: String(err) })
      res.status(500).json({ error: 'Could not update patient' })
    }
  }),
)

workerPortalRouter.get(
  '/volunteers',
  asyncHandler(async (req, res) => {
    const zoneId = req.healthWorker?.zone_id
    if (!zoneId) {
      res.json({ volunteers: [] })
      return
    }

    try {
      const data = await prisma.volunteer.findMany({
        where: { zoneId },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          skills: true,
          vehicle: true,
          maxRadiusKm: true,
          isActive: true,
          lastResponseAt: true,
        },
      })
      const volunteers = data.map((v) => ({
        id: v.id,
        name: v.name,
        skills: v.skills,
        vehicle: v.vehicle,
        max_radius_km: v.maxRadiusKm,
        is_active: v.isActive,
        last_response_at: v.lastResponseAt?.toISOString() ?? null,
      }))
      res.json({ volunteers })
    } catch (err) {
      logError('worker volunteers failed', { error: String(err) })
      res.status(500).json({ error: 'Failed to load volunteers' })
    }
  }),
)
