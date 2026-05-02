import { randomInt } from 'crypto'
import { Router } from 'express'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { asyncHandler } from '@/lib/asyncHandler'
import { hashOtpCode } from '@/lib/otpHash'
import { logAudit, logError } from '@/lib/logger'
import { ensureAssignableHealthWorkerId } from '@/lib/mamaAuth'
import { resolvePublicRegistrationZoneId } from '@/lib/selfRegZone'
import { prisma } from '@/lib/prisma'
import { normalizePhone } from '@/lib/phone'
import { signHospitalPortalToken } from '@/lib/portalJwt'
import { signSosPatientToken } from '@/lib/sosToken'
import { clinicSelfRegisterRateLimit, patientOtpRequestRateLimit, patientSelfRegisterRateLimit } from '@/middleware/rateLimiter'
import { verifySosPatientToken } from '@/lib/sosToken'
import { insertHospitalWithLocation, insertPatientWithLocation } from '@/services/db/geoWrites'
import { getNearbyVolunteers } from '@/services/geo'
import { sendFamilyWelcomeSmsIfEnabled } from '@/services/familyWelcomeOnRegister'
import { fetchPatientForSosById } from '@/services/patientQueries'
import { sendSMS } from '@/services/twilio'

export const publicPatientAccessRouter = Router()

const SOS_TOKEN_TTL_SEC = 180 * 24 * 60 * 60

const relationshipEnum = z.enum(['husband', 'mother', 'sister', 'neighbour', 'other'])

const emergencyContactSchema = z.object({
  name: z.string().min(1),
  phone: z
    .string()
    .min(1)
    .transform((s) => s.replace(/[\s-]/g, ''))
    .pipe(z.string().regex(/^\+?[0-9]{8,20}$/, 'Valid contact phone required')),
  relationship: relationshipEnum,
})

const riskFlagEnum = z.enum([
  'pre_eclampsia',
  'placenta_previa',
  'severe_anaemia',
  'gestational_diabetes',
  'multiple_pregnancy',
  'obstructed_labour_history',
  'hiv_positive',
  'on_medication',
])

const selfRegisterSchema = z
  .object({
    name: z.string().min(2),
    phone_primary: z.string().min(8).max(20).regex(/^\+?[0-9]{8,20}$/),
    zone_id: z.string().uuid().optional(),
    zone_name: z.string().min(2).max(120).optional(),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    language: z.string().min(2).max(8),
    weeks_pregnant: z.number().int().min(1).max(44),
    village: z.string().min(2),
    landmark: z.string().max(200).optional().nullable(),
    blood_type: z.string().min(1).max(16),
    risk_flags: z.array(riskFlagEnum).max(20).optional().default([]),
    medication_name: z.string().max(200).optional().nullable(),
    emergency_contacts: z.array(emergencyContactSchema).min(1).max(4),
  })
  .superRefine((val, ctx) => {
    if (val.risk_flags.includes('on_medication')) {
      const m = val.medication_name?.trim() ?? ''
      if (m.length < 1) {
        ctx.addIssue({
          code: 'custom',
          message: 'medication_name required when on_medication is selected',
          path: ['medication_name'],
        })
      }
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
    const contacts = body.emergency_contacts

    const zoneResolved = await resolvePublicRegistrationZoneId({
      zone_id: body.zone_id,
      zone_name: body.zone_name,
    })
    if (!zoneResolved.ok) {
      res.status(400).json({ error: zoneResolved.error })
      return
    }
    const zoneId = zoneResolved.zoneId

    const lat = body.lat
    const lng = body.lng

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

    const healthWorkerId = await ensureAssignableHealthWorkerId(zoneId)

    const contactsForDb = contacts.map((c) => ({
      name: c.name.trim(),
      phone: c.phone,
      relationship: c.relationship,
    }))
    const emergencyContactsJson = contactsForDb as Prisma.InputJsonValue
    const villageTrim = body.village.trim()
    const riskFlagsList = [...body.risk_flags]
    const onMed = riskFlagsList.includes('on_medication')
    const medicationName = onMed ? (body.medication_name?.trim() || null) : null

    try {
      const data = await insertPatientWithLocation({
        healthWorkerId,
        zoneId,
        name: body.name.trim(),
        age: null,
        phonePrimary,
        phoneSecondary: null,
        village: villageTrim || null,
        landmark: body.landmark?.trim() || null,
        lat,
        lng,
        weeksPregnant: body.weeks_pregnant,
        dueDate: null,
        prevPregnancies: null,
        prevBirths: null,
        prevCsection: false,
        lastAncDate: null,
        bloodType: body.blood_type.trim(),
        language: body.language,
        riskFlags: riskFlagsList,
        medicationName,
        emergencyContacts: emergencyContactsJson,
        registrationVerified: true,
        registrationSource: 'self',
      })
      const sos_token = signSosPatientToken(data.id, SOS_TOKEN_TTL_SEC)
      logAudit('patient_self_registered', { patientId: data.id, zoneId, minimal: false })
      void sendFamilyWelcomeSmsIfEnabled(body.name.trim(), contactsForDb, data.status_token, body.language)
      res.status(201).json({
        id: data.id,
        status_token: data.status_token,
        sos_token,
        registration_verified: true,
      })
    } catch (error) {
      logError('patient self-register failed', { error: String(error) })
      res.status(400).json({ error: 'Could not complete registration', details: String(error) })
    }
  }),
)

const clinicSelfRegisterSchema = z.object({
  name: z.string().min(2).max(120),
  phone: z.string().min(8).max(24),
  type: z.enum(['clinic', 'health_center', 'hospital', 'maternity_home']).default('clinic'),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  zone_id: z.string().uuid().optional(),
  zone_name: z.string().min(2).max(120).optional(),
  services: z.array(z.string()).optional().default([]),
  is_24hr: z.boolean().optional().default(false),
})

publicPatientAccessRouter.post(
  '/clinic-self-register',
  clinicSelfRegisterRateLimit,
  asyncHandler(async (req, res) => {
    const parsed = clinicSelfRegisterSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() })
      return
    }
    const body = parsed.data

    const zoneResolved = await resolvePublicRegistrationZoneId({
      zone_id: body.zone_id,
      zone_name: body.zone_name,
    })
    if (!zoneResolved.ok) {
      res.status(400).json({ error: zoneResolved.error })
      return
    }
    const zoneId = zoneResolved.zoneId

    const phoneNormalized = normalizePhone(body.phone)
    const duplicate = await prisma.hospital.findFirst({
      where: {
        OR: [
          { phoneMain: body.phone.trim() },
          { phoneEmergency: body.phone.trim() },
          { phoneMain: phoneNormalized },
          { phoneEmergency: phoneNormalized },
        ],
      },
      select: { id: true },
    })
    if (duplicate) {
      res.status(409).json({ error: 'A clinic with this phone number is already registered.' })
      return
    }

    try {
      const data = await insertHospitalWithLocation({
        zoneId,
        name: body.name.trim(),
        type: body.type,
        lat: body.lat,
        lng: body.lng,
        phoneMain: body.phone.trim(),
        phoneEmergency: null,
        services: body.services,
        is24hr: body.is_24hr,
        receiveAlerts: true,
        preAlertRadiusKm: null,
      })

      const portalToken = signHospitalPortalToken(data.id)
      logAudit('clinic_self_registered', { hospitalId: data.id, zoneId })

      res.status(201).json({
        id: data.id,
        portal_token: portalToken,
        name: body.name.trim(),
      })
    } catch (error) {
      logError('clinic self-register failed', { error: String(error) })
      res.status(400).json({ error: 'Could not complete registration', details: String(error) })
    }
  }),
)
