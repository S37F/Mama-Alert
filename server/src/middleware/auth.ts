import type { NextFunction, Request, Response } from 'express'
import { asyncHandler } from '@/lib/asyncHandler'
import { readSessionHeaders } from '@/lib/mamaAuth'
import { prisma } from '@/lib/prisma'

const AUTH_CACHE_TTL_MS = 5 * 60 * 1000

type CachedStaffAuth = {
  accessLevel: 'health_worker' | 'admin'
  zoneId: string | null
  expiresAt: number
}

const staffAuthCache = new Map<string, CachedStaffAuth>()

function authCacheKey(role: string, profileId: string): string {
  return `${role}:${profileId}`
}

function getCachedStaffAuth(role: string, profileId: string): CachedStaffAuth | null {
  const key = authCacheKey(role, profileId)
  const cached = staffAuthCache.get(key)
  if (!cached) {
    return null
  }
  if (cached.expiresAt <= Date.now()) {
    staffAuthCache.delete(key)
    return null
  }
  return cached
}

function setCachedStaffAuth(role: string, profileId: string, auth: Omit<CachedStaffAuth, 'expiresAt'>): void {
  staffAuthCache.set(authCacheKey(role, profileId), {
    ...auth,
    expiresAt: Date.now() + AUTH_CACHE_TTL_MS,
  })
}

/** Zone admins must have `zone_id` set; health workers may omit it. */
export function assertAdminHasZone(res: Response, accessLevel: string, zoneId: string | null): boolean {
  if (accessLevel === 'admin' && !zoneId) {
    res.status(403).json({ error: 'Admin account must have a zone assigned' })
    return false
  }
  return true
}

export const requireAuth = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const session = readSessionHeaders(req)
  if (!session || (session.role !== 'health_worker' && session.role !== 'admin')) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const cached = getCachedStaffAuth(session.role, session.profileId)
  let auth = cached
  if (!auth) {
    const hw = await prisma.healthWorker.findUnique({
      where: { userId: session.profileId },
      select: { accessLevel: true, zoneId: true },
    })
    if (!hw) {
      res.status(403).json({ error: 'Health worker profile not found' })
      return
    }
    if (hw.accessLevel === 'health_worker' || hw.accessLevel === 'admin') {
      auth = { accessLevel: hw.accessLevel, zoneId: hw.zoneId, expiresAt: Date.now() + AUTH_CACHE_TTL_MS }
      setCachedStaffAuth(session.role, session.profileId, {
        accessLevel: hw.accessLevel,
        zoneId: hw.zoneId,
      })
    } else {
      res.status(403).json({ error: 'Invalid access level' })
      return
    }
  }

  const level = auth.accessLevel
  if (level !== 'health_worker' && level !== 'admin') {
    res.status(403).json({ error: 'Invalid access level' })
    return
  }
  if (session.role !== level) {
    res.status(403).json({ error: 'Session role mismatch' })
    return
  }
  if (!assertAdminHasZone(res, level, auth.zoneId)) {
    return
  }

  req.authUserId = session.profileId
  req.healthWorker = {
    access_level: level,
    zone_id: auth.zoneId,
  }
  next()
})

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.healthWorker?.access_level !== 'admin') {
    res.status(403).json({ error: 'Admin only' })
    return
  }
  next()
}

/** Health worker field routes - not zone admins. */
export function requireHealthWorker(req: Request, res: Response, next: NextFunction): void {
  if (req.healthWorker?.access_level !== 'health_worker') {
    res.status(403).json({ error: 'Health worker access only' })
    return
  }
  next()
}
