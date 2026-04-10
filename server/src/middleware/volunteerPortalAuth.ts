import type { NextFunction, Request, Response } from 'express'
import { verifyVolunteerPortalToken } from '@/lib/portalJwt'

export function requireVolunteerPortal(req: Request, res: Response, next: NextFunction): void {
  const hdr = req.headers.authorization
  const token = hdr?.startsWith('Bearer ') ? hdr.slice(7) : undefined
  const claims = token ? verifyVolunteerPortalToken(token) : null
  if (!claims) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  req.volunteerPortal = { volunteerId: claims.sub, phoneE164: claims.ph }
  next()
}
