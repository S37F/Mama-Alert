import { Router } from 'express'
import { z } from 'zod'
import { asyncHandler } from '@/lib/asyncHandler'
import {
  createHealthWorkerAccount,
  ensureAssignableHealthWorkerId,
  isPhoneRegistered,
  lookupSessionByPhone,
  resolveCommunityZoneId,
  resolveOrCreateZone,
  resolveSignupCoordinates,
} from '@/lib/mamaAuth'
import { insertPatientWithLocation, insertVolunteerWithLocation } from '@/services/db/geoWrites'

export const authRouter = Router()

const patientSignupSchema = z.object({
  role: z.literal('patient'),
  name: z.string().min(2),
  phone: z.string().min(10),
  weeksPregnant: z.number().int().min(1).max(44),
  village: z.string().min(2),
  landmark: z.string().optional(),
  language: z.string().default('en'),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
})

const volunteerSignupSchema = z.object({
  role: z.literal('volunteer'),
  name: z.string().min(2),
  phone: z.string().min(10),
  village: z.string().min(2),
  skills: z.array(z.string()).min(1),
  vehicle: z.enum(['motorcycle', 'car', 'bicycle', 'none']),
  availableHours: z.enum(['24/7', 'daytime', 'nights', 'weekends']),
  maxRadiusKm: z.number().int().min(1).max(100).default(5),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
})

const healthWorkerSignupSchema = z.object({
  role: z.literal('health_worker'),
  name: z.string().min(2),
  phone: z.string().min(10),
  roleTitle: z.string().min(2),
  organisation: z.string().min(2),
  zone: z.string().min(2),
})

const adminSignupSchema = z.object({
  role: z.literal('admin'),
  name: z.string().min(2),
  phone: z.string().min(10),
  organisation: z.string().min(2),
  zone: z.string().min(2),
  adminCode: z.string().min(1),
})

const signupSchema = z.discriminatedUnion('role', [
  patientSignupSchema,
  volunteerSignupSchema,
  healthWorkerSignupSchema,
  adminSignupSchema,
])

const loginSchema = z.object({
  phone: z.string().min(10),
})

authRouter.post(
  '/signup',
  asyncHandler(async (req, res) => {
    const parsed = signupSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() })
      return
    }

    const body = parsed.data
    if (await isPhoneRegistered(body.phone)) {
      res.status(409).json({ error: 'This phone is already registered. Try logging in.' })
      return
    }

    if (body.role === 'patient') {
      const zoneId = await resolveCommunityZoneId(body.village)
      const healthWorkerId = await ensureAssignableHealthWorkerId(zoneId)
      const coords = resolveSignupCoordinates({
        ...(body.lat !== undefined ? { lat: body.lat } : {}),
        ...(body.lng !== undefined ? { lng: body.lng } : {}),
      })
      const patient = await insertPatientWithLocation({
        healthWorkerId,
        zoneId,
        name: body.name.trim(),
        age: null,
        phonePrimary: body.phone.trim(),
        phoneSecondary: null,
        village: body.village.trim(),
        landmark: body.landmark?.trim() || null,
        lat: coords.lat,
        lng: coords.lng,
        weeksPregnant: body.weeksPregnant,
        dueDate: null,
        prevPregnancies: null,
        prevBirths: null,
        prevCsection: false,
        lastAncDate: null,
        bloodType: null,
        language: body.language,
        riskFlags: [],
        medicationName: null,
        emergencyContacts: [],
        registrationVerified: false,
        registrationSource: 'self',
      })
      const session = await lookupSessionByPhone(body.phone)
      if (!session) {
        res.status(500).json({ error: 'Could not create account' })
        return
      }
      res.status(201).json({
        success: true,
        role: 'patient',
        name: body.name.trim(),
        profileId: patient.id,
        session,
      })
      return
    }

    if (body.role === 'volunteer') {
      const zoneId = await resolveCommunityZoneId(body.village)
      const coords = resolveSignupCoordinates({
        ...(body.lat !== undefined ? { lat: body.lat } : {}),
        ...(body.lng !== undefined ? { lng: body.lng } : {}),
      })
      const volunteer = await insertVolunteerWithLocation({
        zoneId,
        name: body.name.trim(),
        phone: body.phone.trim(),
        lat: coords.lat,
        lng: coords.lng,
        village: body.village.trim(),
        availabilityHours: body.availableHours,
        skills: body.skills,
        vehicle: body.vehicle,
        maxRadiusKm: body.maxRadiusKm,
        language: 'en',
      })
      const session = await lookupSessionByPhone(body.phone)
      if (!session) {
        res.status(500).json({ error: 'Could not create account' })
        return
      }
      res.status(201).json({
        success: true,
        role: 'volunteer',
        name: body.name.trim(),
        profileId: volunteer.id,
        session,
      })
      return
    }

    if (body.role === 'health_worker') {
      const zone = await resolveOrCreateZone(body.zone, body.organisation)
      const session = await createHealthWorkerAccount({
        name: body.name.trim(),
        phone: body.phone.trim(),
        zoneId: zone.id,
        accessLevel: 'health_worker',
        organisation: body.organisation.trim(),
        roleTitle: body.roleTitle.trim(),
      })
      res.status(201).json({
        success: true,
        role: 'health_worker',
        name: body.name.trim(),
        profileId: session.profileId,
        session,
      })
      return
    }

    const adminCode = process.env.ADMIN_SIGNUP_CODE?.trim()
    if (!adminCode) {
      throw new Error('Missing ADMIN_SIGNUP_CODE - admin sign-up will be disabled.')
    }
    if (body.adminCode.trim() !== adminCode) {
      res.status(403).json({ error: 'Invalid access code' })
      return
    }

    const zone = await resolveOrCreateZone(body.zone, body.organisation)
    const session = await createHealthWorkerAccount({
      name: body.name.trim(),
      phone: body.phone.trim(),
      zoneId: zone.id,
      accessLevel: 'admin',
      organisation: body.organisation.trim(),
      roleTitle: 'Administrator',
    })
    res.status(201).json({
      success: true,
      role: 'admin',
      name: body.name.trim(),
      profileId: session.profileId,
      session,
    })
  }),
)

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() })
      return
    }

    const session = await lookupSessionByPhone(parsed.data.phone)
    if (!session) {
      res.status(404).json({ error: 'No account found with this number. Sign up first.' })
      return
    }

    res.json({
      role: session.role,
      profileId: session.profileId,
      name: session.name,
      phone: session.phone,
      session,
    })
  }),
)
