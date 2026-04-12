import { randomInt } from 'crypto'
import { Router } from 'express'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { asyncHandler } from '@/lib/asyncHandler'
import { hashOtpCode } from '@/lib/otpHash'
import { logAudit, logError } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
import { normalizePhone } from '@/lib/phone'
import { signSosPatientToken } from '@/lib/sosToken'
import { patientOtpRequestRateLimit, patientSelfRegisterRateLimit } from '@/middleware/rateLimiter'
import { getPublicAppUrl } from '@/config/publicUrl'
import { verifySosPatientToken } from '@/lib/sosToken'
import { insertPatientWithLocation } from '@/services/db/geoWrites'
import { getNearbyVolunteers } from '@/services/geo'
import { sendFamilyWelcomeSmsIfEnabled } from '@/services/familyWelcomeOnRegister'
import { fetchPatientForSosById } from '@/services/patientQueries'
import { resolveSelfRegHealthWorkerId } from '@/services/selfRegHealthWorker'
import { sendSMS } from '@/services/twilio'

export const publicPatientAccessRouter = Router()

const SOS_TOKEN_TTL_SEC = 180 * 24 * 60 * 60

const relationshipEnum = z.enum(['husband', 'mother', 'sister', 'neighbour', 'other'])

const emergencyContactSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(8),
  relationship: relationshipEnum,
})

const selfRegisterSchema = z
  .object({
    name: z.string().min(1),
    phone_primary: z.string().min(8).max(20).regex(/^\+?[0-9]{8,20}$/),
    zone_id: z.string().uuid().optional(),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
    language: z.string().min(2).max(8),
    weeks_pregnant: z.number().int().min(1).max(44).optional().nullable(),
    village: z.string().optional(),
    emergency_contacts: z.array(emergencyContactSchema).max(4).optional().default([]),
  })
  .superRefine((val, ctx) => {
    const contacts = val.emergency_contacts ?? []
    const hasContacts = contacts.length >= 1
    if (contacts.length > 4) {
      ctx.addIssue({ code: 'custom', message: 'Too many emergency contacts', path: ['emergency_contacts'] })
    }
    if (hasContacts) {
      if (!val.zone_id) {
        ctx.addIssue({ code: 'custom', message: 'zone_id required', path: ['zone_id'] })
      }
      if (val.lat === undefined || val.lng === undefined) {
        ctx.addIssue({ code: 'custom', message: 'lat and lng required', path: ['lat'] })
      }
    } else {
      const v = val.village?.trim() ?? ''
      if (v.length < 1) {
        ctx.addIssue({ code: 'custom', message: 'village required for minimal registration', path: ['village'] })
      }
    }
    const hasLat = val.lat !== undefined
    const hasLng = val.lng !== undefined
    if (hasLat !== hasLng) {
      ctx.addIssue({ code: 'custom', message: 'lat and lng must be provided together', path: ['lng'] })
    }
  })

publicPatientAccessRouter.get(
  '/patient-volunteers-nearby',
  asyncHandler(async (req, res) => {
    const sosToken = typeof req.query.sosToken === 'string' ? req.query.sosToken.trim() : ''
    if (sosToken.length < 24) {
      res.status(400).json({ error: 'sosToken query parameter required' })
      return
    }
    const verified = verifySosPatientToken(sosToken)
    if (!verified) {
      res.status(401).json({ error: 'Invalid or expired SOS token' })
      return
    }
    const row = await fetchPatientForSosById(verified.patientId)
    if (!row) {
      res.status(404).json({ error: 'Patient not found' })
      return
    }
    let volunteers: Awaited<ReturnType<typeof getNearbyVolunteers>> = []
    try {
      volunteers = await getNearbyVolunteers(row.lat, row.lng, 5000)
    } catch (err) {
      logError('patient-volunteers-nearby: geo query failed', { error: String(err) })
      res.status(500).json({ error: 'Could not load volunteers' })
      return
    }
    res.json({ count: volunteers.length })
  }),
)

publicPatientAccessRouter.get(
  '/zones',
  asyncHandler(async (_req, res) => {
    const zones = await prisma.zone.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    })
    res.json({ zones })
  }),
)

const otpRequestSchema = z.object({
  phone: z.string().min(8).max(24),
})

publicPatientAccessRouter.post(
  '/patient-otp/request',
  patientOtpRequestRateLimit,
  asyncHandler(async (req, res) => {
    const parsed = otpRequestSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() })
      return
    }
    const phoneE164 = normalizePhone(parsed.data.phone)
    const patient = await prisma.patient.findFirst({
      where: { phoneE164 },
      select: { id: true, phonePrimary: true },
    })

    if (!patient) {
      res.status(202).json({ ok: true })
      return
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
    const codeHash = hashOtpCode(code)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

    try {
      await prisma.patientOtpChallenge.create({
        data: {
          patientId: patient.id,
          codeHash,
          expiresAt,
        },
      })
    } catch (insErr) {
      logError('patient-otp: insert challenge failed', { error: String(insErr) })
      res.status(500).json({ error: 'Could not start sign-in' })
      return
    }

    try {
      await sendSMS(patient.phonePrimary, `MamaAlert code: ${code}. Valid 10 minutes.`)
    } catch (err) {
      logError('patient-otp: SMS failed', { err: String(err) })
      res.status(500).json({ error: 'Could not send code' })
      return
    }

    res.status(202).json({ ok: true })
  }),
)

const otpVerifySchema = z.object({
  phone: z.string().min(8).max(24),
  code: z.string().regex(/^\d{4,8}$/),
})

publicPatientAccessRouter.post(
  '/patient-otp/verify',
  asyncHandler(async (req, res) => {
    const parsed = otpVerifySchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() })
      return
    }
    const phoneE164 = normalizePhone(parsed.data.phone)
    const patient = await prisma.patient.findFirst({
      where: { phoneE164 },
      select: { id: true },
    })

    if (!patient) {
      res.status(401).json({ error: 'Invalid code' })
      return
    }

    const wantHash = hashOtpCode(parsed.data.code)
    const now = new Date()
    const rows = await prisma.patientOtpChallenge.findMany({
      where: {
        patientId: patient.id,
        consumedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, codeHash: true },
    })

    if (rows.length === 0) {
      res.status(401).json({ error: 'Invalid code' })
      return
    }

    const match = rows.find((r) => r.codeHash === wantHash)
    if (!match) {
      res.status(401).json({ error: 'Invalid code' })
      return
    }

    await prisma.patientOtpChallenge.update({
      where: { id: match.id },
      data: { consumedAt: new Date() },
    })

    const row = await fetchPatientForSosById(patient.id)
    if (!row) {
      res.status(500).json({ error: 'Could not load patient' })
      return
    }

    const sos_token = signSosPatientToken(patient.id, SOS_TOKEN_TTL_SEC)
    const firstName = row.name.split(/\s+/)[0] ?? row.name
    const language = row.language.split('-')[0] ?? 'en'
    logAudit('patient_otp_verified', { patientId: patient.id })
    res.json({
      sos_token,
      firstName,
      language,
      weeksPregnant: row.weeks_pregnant ?? null,
    })
  }),
)

publicPatientAccessRouter.post(
  '/patient-self-register',
  patientSelfRegisterRateLimit,
  asyncHandler(async (req, res) => {
    const parsed = selfRegisterSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() })
      return
    }
    const body = parsed.data
    const contacts = body.emergency_contacts ?? []
    const hasContacts = contacts.length >= 1

    const zoneId = body.zone_id?.trim() || process.env.SELF_REG_DEFAULT_ZONE_ID?.trim()
    if (!zoneId) {
      res.status(400).json({
        error: 'zone_id is required, or configure SELF_REG_DEFAULT_ZONE_ID for minimal self-registration.',
      })
      return
    }

    const zone = await prisma.zone.findUnique({
      where: { id: zoneId },
      select: { id: true },
    })
    if (!zone) {
      res.status(400).json({ error: 'Unknown zone' })
      return
    }

    let lat = body.lat
    let lng = body.lng
    if (lat === undefined || lng === undefined) {
      const fla = process.env.SELF_REG_FALLBACK_LAT
      const flg = process.env.SELF_REG_FALLBACK_LNG
      lat = Number.parseFloat(fla ?? '')
      lng = Number.parseFloat(flg ?? '')
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        res.status(400).json({
          error:
            'Share your location on the form, or ask your host to set SELF_REG_FALLBACK_LAT and SELF_REG_FALLBACK_LNG.',
        })
        return
      }
    }

    const phonePrimary = body.phone_primary.trim()
    const phoneE164 = normalizePhone(phonePrimary)
    const duplicate = await prisma.patient.findFirst({
      where: { phoneE164 },
      select: { id: true },
    })
    if (duplicate) {
      res.status(409).json({ error: 'This number is already registered. Sign in with your phone instead.' })
      return
    }

    const healthWorkerId = await resolveSelfRegHealthWorkerId(zoneId)
    if (!healthWorkerId) {
      res.status(503).json({
        error:
          'Self-registration is not available for this area yet. Please contact your health worker or set SELF_REG_DEFAULT_HEALTH_WORKER_ID.',
      })
      return
    }

    const emergencyContactsJson = contacts as Prisma.InputJsonValue
    const villageTrim = hasContacts ? (body.village?.trim() || null) : (body.village ?? '').trim()
    const registrationVerified = hasContacts
    const registrationSource = 'self'

    try {
      const data = await insertPatientWithLocation({
        healthWorkerId,
        zoneId,
        name: body.name.trim(),
        age: null,
        phonePrimary,
        phoneSecondary: null,
        village: villageTrim || null,
        landmark: null,
        lat,
        lng,
        weeksPregnant: body.weeks_pregnant ?? null,
        dueDate: null,
        prevPregnancies: null,
        prevBirths: null,
        prevCsection: false,
        lastAncDate: null,
        bloodType: null,
        language: body.language,
        riskFlags: [],
        medicationName: null,
        emergencyContacts: emergencyContactsJson,
        registrationVerified,
        registrationSource,
      })
      const sos_token = signSosPatientToken(data.id, SOS_TOKEN_TTL_SEC)
      logAudit('patient_self_registered', { patientId: data.id, zoneId, minimal: !hasContacts })
      if (hasContacts) {
        void sendFamilyWelcomeSmsIfEnabled(body.name.trim(), contacts, data.status_token, body.language)
      } else {
        const hw = await prisma.healthWorker.findUnique({
          where: { userId: healthWorkerId },
          select: { phone: true },
        })
        if (hw?.phone) {
          const base = getPublicAppUrl()
          const dash = base ? `${base}/dashboard` : 'your MamaAlert dashboard'
          const msg = `MamaAlert: ${body.name.trim()} self-registered (${villageTrim}). Complete their profile: ${dash}`
          void sendSMS(hw.phone, msg.slice(0, 480))
        }
      }
      res.status(201).json({
        id: data.id,
        status_token: data.status_token,
        sos_token,
        registration_verified: registrationVerified,
      })
    } catch (error) {
      logError('patient self-register failed', { error: String(error) })
      res.status(400).json({ error: 'Could not complete registration', details: String(error) })
    }
  }),
)
