import { Router } from 'express'
import { z } from 'zod'
import { asyncHandler } from '@/lib/asyncHandler'
import {
  type AuthSessionResponse,
  isPhoneRegistered,
  lookupSessionByPhone,
  resolveCommunityZoneId,
  resolveSignupCoordinates,
} from '@/lib/mamaAuth'
import { clearAuthCookies, setMamaSessionCookie, setVolunteerPortalCookie } from '@/lib/httpCookies'
import { authPhoneLoginRateLimit } from '@/middleware/rateLimiter'
import { insertVolunteerWithLocation } from '@/services/db/geoWrites'

export const authRouter = Router()

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

const signupSchema = volunteerSignupSchema

const loginSchema = z.object({
  phone: z.string().min(10),
})

function setAuthCookiesForSession(res: import('express').Response, session: AuthSessionResponse): void {
  setMamaSessionCookie(res, session.sessionToken)
  if (session.role === 'volunteer' && session.volunteerPortalToken) {
    setVolunteerPortalCookie(res, session.volunteerPortalToken)
  }
}

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
    setAuthCookiesForSession(res, session)
    res.status(201).json({
      success: true,
      role: 'volunteer',
      name: body.name.trim(),
      profileId: volunteer.id,
      session,
    })
  }),
)

authRouter.post(
  '/login',
  authPhoneLoginRateLimit,
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

    setAuthCookiesForSession(res, session)
    res.json({
      role: session.role,
      profileId: session.profileId,
      name: session.name,
      phone: session.phone,
      session,
    })
  }),
)

authRouter.post('/logout', (_req, res) => {
  clearAuthCookies(res)
  res.json({ ok: true })
})
