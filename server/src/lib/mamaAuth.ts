import { randomUUID } from 'crypto'
import type { Request } from 'express'
import { z } from 'zod'
import { logWarn } from '@/lib/logger'
import { MAMA_SESSION_COOKIE, readCookie } from '@/lib/httpCookies'
import { normalizePhone } from '@/lib/phone'
import { prisma } from '@/lib/prisma'
import { signVolunteerPortalToken } from '@/lib/portalJwt'
import { signMamaSessionToken, verifyMamaSessionToken } from '@/lib/sessionToken'
import { signSosPatientToken } from '@/lib/sosToken'
import { resolveSelfRegHealthWorkerId } from '@/services/selfRegHealthWorker'

const SOS_TOKEN_TTL_SEC = 180 * 24 * 60 * 60

export const sessionRoleSchema = z.enum(['patient', 'volunteer', 'health_worker', 'admin'])

export type SessionRole = z.infer<typeof sessionRoleSchema>

type StaffAccessLevel = 'health_worker' | 'admin'

interface SessionHeaderShape {
  profileId: string
  role: SessionRole
}

interface StaffLookupRow {
  profileId: string
  name: string
  phone: string | null
  accessLevel: StaffAccessLevel
  zoneId: string | null
}

export interface AuthSessionResponse {
  phone: string
  role: SessionRole
  profileId: string
  name: string
  signedInAt: number
  sessionToken: string
  zoneId?: string | null
  sosToken?: string
  volunteerPortalToken?: string
}

function parseBearerSession(req: Request): SessionHeaderShape | null {
  const hdr = req.headers.authorization
  const token = hdr?.startsWith('Bearer ') ? hdr.slice(7).trim() : ''
  if (!token) {
    return null
  }
  const claims = verifyMamaSessionToken(token)
  if (!claims) {
    return null
  }
  return { role: claims.role, profileId: claims.sub }
}

function parseCookieSession(req: Request): SessionHeaderShape | null {
  const token = readCookie(req, MAMA_SESSION_COOKIE)
  if (!token) {
    return null
  }
  const claims = verifyMamaSessionToken(token)
  if (!claims) {
    return null
  }
  return { role: claims.role, profileId: claims.sub }
}

function parseLegacySessionHeaders(req: Request): SessionHeaderShape | null {
  const roleHeader = req.headers['x-mamaalert-role']
  const profileIdHeader = req.headers['x-mamaalert-profile-id']
  const role = typeof roleHeader === 'string' ? roleHeader.trim() : ''
  const profileId = typeof profileIdHeader === 'string' ? profileIdHeader.trim() : ''
  const parsed = z
    .object({
      role: sessionRoleSchema,
      profileId: z.string().uuid(),
    })
    .safeParse({ role, profileId })
  return parsed.success ? parsed.data : null
}

export function readSessionHeaders(req: Request): SessionHeaderShape | null {
  const cookie = parseCookieSession(req)
  if (cookie) {
    return cookie
  }

  const bearer = parseBearerSession(req)
  if (bearer) {
    return bearer
  }

  const allowLegacy =
    process.env.ALLOW_LEGACY_SESSION_HEADERS === 'true' ||
    process.env.ALLOW_LEGACY_SESSION_HEADERS === '1'
  return allowLegacy ? parseLegacySessionHeaders(req) : null
}

export function buildSessionResponse(input: {
  phone: string
  role: SessionRole
  profileId: string
  name: string
  zoneId?: string | null
  sosToken?: string
  volunteerPortalToken?: string
}): AuthSessionResponse {
  return {
    phone: input.phone,
    role: input.role,
    profileId: input.profileId,
    name: input.name,
    signedInAt: Date.now(),
    sessionToken: signMamaSessionToken(input.profileId, input.role),
    ...(input.zoneId !== undefined ? { zoneId: input.zoneId } : {}),
    ...(input.sosToken ? { sosToken: input.sosToken } : {}),
    ...(input.volunteerPortalToken ? { volunteerPortalToken: input.volunteerPortalToken } : {}),
  }
}

async function findStaffByPhone(rawPhone: string): Promise<StaffLookupRow | null> {
  const rows = await prisma.$queryRaw<StaffLookupRow[]>`
    SELECT
      user_id AS "profileId",
      name,
      phone,
      access_level AS "accessLevel",
      zone_id AS "zoneId"
    FROM public.health_workers
    WHERE phone IS NOT NULL
      AND public.normalize_phone_for_match(phone) = public.normalize_phone_for_match(${rawPhone})
    ORDER BY
      CASE WHEN access_level = 'admin' THEN 0 ELSE 1 END,
      created_at ASC
    LIMIT 1
  `
  return rows[0] ?? null
}

export async function lookupSessionByPhone(rawPhone: string): Promise<AuthSessionResponse | null> {
  const normalizedPhone = normalizePhone(rawPhone)

  const staff = await findStaffByPhone(normalizedPhone)
  if (staff) {
    return buildSessionResponse({
      phone: staff.phone ?? normalizedPhone,
      role: staff.accessLevel === 'admin' ? 'admin' : 'health_worker',
      profileId: staff.profileId,
      name: staff.name,
      zoneId: staff.zoneId,
    })
  }

  const volunteer = await prisma.volunteer.findFirst({
    where: { phoneE164: normalizedPhone },
    select: {
      id: true,
      name: true,
      phone: true,
      phoneE164: true,
      zoneId: true,
    },
  })
  if (volunteer) {
    return buildSessionResponse({
      phone: volunteer.phone,
      role: 'volunteer',
      profileId: volunteer.id,
      name: volunteer.name,
      zoneId: volunteer.zoneId,
      volunteerPortalToken: signVolunteerPortalToken(volunteer.id, volunteer.phoneE164),
    })
  }

  const patient = await prisma.patient.findFirst({
    where: { phoneE164: normalizedPhone },
    select: {
      id: true,
      name: true,
      phonePrimary: true,
      zoneId: true,
    },
  })
  if (patient) {
    return buildSessionResponse({
      phone: patient.phonePrimary,
      role: 'patient',
      profileId: patient.id,
      name: patient.name,
      zoneId: patient.zoneId,
      sosToken: signSosPatientToken(patient.id, SOS_TOKEN_TTL_SEC),
    })
  }

  return null
}

export async function isPhoneRegistered(rawPhone: string): Promise<boolean> {
  const match = await lookupSessionByPhone(rawPhone)
  return Boolean(match)
}

export async function resolveOrCreateZone(zoneName: string, adminOrg?: string | null): Promise<{ id: string }> {
  const trimmedName = zoneName.trim()
  const existing = await prisma.zone.findFirst({
    where: { name: { equals: trimmedName, mode: 'insensitive' } },
    select: { id: true, adminOrg: true },
  })
  if (existing) {
    if (adminOrg && !existing.adminOrg) {
      await prisma.zone.update({
        where: { id: existing.id },
        data: { adminOrg },
      })
    }
    return { id: existing.id }
  }
  const created = await prisma.zone.create({
    data: {
      name: trimmedName,
      ...(adminOrg ? { adminOrg } : {}),
    },
    select: { id: true },
  })
  return created
}

export async function resolveCommunityZoneId(nameHint: string): Promise<string> {
  const fallbackId = process.env.SELF_REG_DEFAULT_ZONE_ID?.trim()
  if (fallbackId) {
    const existing = await prisma.zone.findUnique({
      where: { id: fallbackId },
      select: { id: true },
    })
    if (existing) {
      return existing.id
    }
  }
  return (await resolveOrCreateZone(nameHint)).id
}

export function resolveSignupCoordinates(input?: {
  lat?: number
  lng?: number
}): { lat: number; lng: number } {
  if (typeof input?.lat === 'number' && typeof input?.lng === 'number') {
    return { lat: input.lat, lng: input.lng }
  }

  const fallback = readSignupFallbackCoordinates()
  if (fallback) {
    return fallback
  }

  logWarn('signup missing coordinates; set SELF_REG_FALLBACK_LAT/LNG only if browser location is unavailable')
  throw Object.assign(
    new Error('Location is required. Share browser location or configure SELF_REG_FALLBACK_LAT and SELF_REG_FALLBACK_LNG.'),
    { statusCode: 400 },
  )
}

export function readSignupFallbackCoordinates(): { lat: number; lng: number } | null {
  const envLat = Number.parseFloat(process.env.SELF_REG_FALLBACK_LAT ?? '')
  const envLng = Number.parseFloat(process.env.SELF_REG_FALLBACK_LNG ?? '')
  if (Number.isFinite(envLat) && Number.isFinite(envLng)) {
    return { lat: envLat, lng: envLng }
  }

  return null
}

export async function ensureAssignableHealthWorkerId(zoneId: string): Promise<string> {
  const resolved = await resolveSelfRegHealthWorkerId(zoneId)
  if (resolved) {
    return resolved
  }

  const placeholder = await prisma.healthWorker.findFirst({
    where: {
      zoneId,
      accessLevel: 'health_worker',
      phone: null,
      name: 'Unassigned Health Worker',
    },
    orderBy: { createdAt: 'asc' },
    select: { userId: true },
  })
  if (placeholder) {
    return placeholder.userId
  }

  const userId = randomUUID()
  await prisma.$executeRaw`
    INSERT INTO public.health_workers (
      user_id,
      name,
      phone,
      zone_id,
      access_level
    ) VALUES (
      ${userId}::uuid,
      ${'Unassigned Health Worker'},
      NULL,
      ${zoneId}::uuid,
      ${'health_worker'}
    )
  `
  return userId
}

export async function createHealthWorkerAccount(input: {
  name: string
  phone: string
  zoneId: string
  accessLevel: StaffAccessLevel
  organisation?: string | null
  roleTitle?: string | null
}): Promise<AuthSessionResponse> {
  const userId = randomUUID()
  const rows = await prisma.$queryRaw<
    { profileId: string; name: string; phone: string; zoneId: string | null; accessLevel: StaffAccessLevel }[]
  >`
    INSERT INTO public.health_workers (
      user_id,
      name,
      phone,
      zone_id,
      access_level,
      organisation,
      role_title
    ) VALUES (
      ${userId}::uuid,
      ${input.name},
      ${input.phone},
      ${input.zoneId}::uuid,
      ${input.accessLevel},
      ${input.organisation ?? null},
      ${input.roleTitle ?? null}
    )
    RETURNING
      user_id AS "profileId",
      name,
      phone,
      zone_id AS "zoneId",
      access_level AS "accessLevel"
  `

  const created = rows[0]
  if (!created) {
    throw new Error('Could not create health worker profile')
  }

  return buildSessionResponse({
    phone: created.phone,
    role: created.accessLevel === 'admin' ? 'admin' : 'health_worker',
    profileId: created.profileId,
    name: created.name,
    zoneId: created.zoneId,
  })
}
