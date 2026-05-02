import type { NextFunction, Request, Response } from 'express'
import { csrfMatches, requestHasAuthCookie } from '@/lib/httpCookies'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

function isExemptPath(path: string): boolean {
  return (
    path === '/api/auth/logout' ||
    path === '/api/auth/login' ||
    path === '/api/auth/signup' ||
    path.startsWith('/api/health') ||
    path.startsWith('/api/hospital') ||
    path.startsWith('/api/public') ||
    path.startsWith('/api/sos') ||
    path.startsWith('/api/sms-reply') ||
    path.startsWith('/api/sms-status') ||
    path.startsWith('/api/status') ||
    path.startsWith('/api/ussd') ||
    path.startsWith('/api/volunteer')
  )
}

export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method) || isExemptPath(req.path) || !requestHasAuthCookie(req)) {
    next()
    return
  }
  if (!csrfMatches(req)) {
    res.status(403).json({ error: 'Invalid CSRF token' })
    return
  }
  next()
}
