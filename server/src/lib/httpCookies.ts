import { randomBytes } from 'crypto'
import type { CookieOptions, Request, Response } from 'express'

export const MAMA_SESSION_COOKIE = 'mama_session'
export const VOLUNTEER_PORTAL_COOKIE = 'mama_volunteer_portal'
export const HOSPITAL_PORTAL_COOKIE = 'mama_hospital_portal'
export const CSRF_COOKIE = 'mama_csrf'

const AUTH_COOKIE_NAMES = [MAMA_SESSION_COOKIE, VOLUNTEER_PORTAL_COOKIE, HOSPITAL_PORTAL_COOKIE] as const

export function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) {
    return {}
  }
  const out: Record<string, string> = {}
  for (const part of header.split(';')) {
    const idx = part.indexOf('=')
    if (idx <= 0) {
      continue
    }
    const key = part.slice(0, idx).trim()
    const value = part.slice(idx + 1).trim()
    if (!key) {
      continue
    }
    try {
      out[key] = decodeURIComponent(value)
    } catch {
      out[key] = value
    }
  }
  return out
}

export function readCookie(req: Request, name: string): string | undefined {
  return parseCookies(req.headers.cookie)[name]
}

function baseCookieOptions(httpOnly: boolean): CookieOptions {
  const isProduction = process.env.NODE_ENV === 'production'
  return {
    httpOnly,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
  }
}

function authCookieOptions(maxAgeMs: number): CookieOptions {
  return {
    ...baseCookieOptions(true),
    maxAge: maxAgeMs,
  }
}

function csrfCookieOptions(maxAgeMs: number): CookieOptions {
  return {
    ...baseCookieOptions(false),
    maxAge: maxAgeMs,
  }
}

export function makeCsrfToken(): string {
  return randomBytes(32).toString('hex')
}

export function setReadableCsrfCookie(res: Response, maxAgeMs = 7 * 24 * 60 * 60 * 1000): string {
  const token = makeCsrfToken()
  res.cookie(CSRF_COOKIE, token, csrfCookieOptions(maxAgeMs))
  return token
}

export function setMamaSessionCookie(res: Response, token: string): void {
  res.cookie(MAMA_SESSION_COOKIE, token, authCookieOptions(7 * 24 * 60 * 60 * 1000))
  setReadableCsrfCookie(res)
}

export function setVolunteerPortalCookie(res: Response, token: string): void {
  res.cookie(VOLUNTEER_PORTAL_COOKIE, token, authCookieOptions(7 * 24 * 60 * 60 * 1000))
  setReadableCsrfCookie(res)
}

export function setHospitalPortalCookie(res: Response, token: string): void {
  res.cookie(HOSPITAL_PORTAL_COOKIE, token, authCookieOptions(365 * 24 * 60 * 60 * 1000))
  setReadableCsrfCookie(res, 365 * 24 * 60 * 60 * 1000)
}

export function clearAuthCookies(res: Response): void {
  const opts = baseCookieOptions(true)
  for (const name of AUTH_COOKIE_NAMES) {
    res.clearCookie(name, opts)
  }
  res.clearCookie(CSRF_COOKIE, baseCookieOptions(false))
}

export function requestHasAuthCookie(req: Request): boolean {
  const cookies = parseCookies(req.headers.cookie)
  return AUTH_COOKIE_NAMES.some((name) => typeof cookies[name] === 'string' && cookies[name].length > 0)
}

export function csrfMatches(req: Request): boolean {
  const header = req.headers['x-csrf-token']
  const headerValue = Array.isArray(header) ? header[0] : header
  const cookieValue = readCookie(req, CSRF_COOKIE)
  return Boolean(headerValue && cookieValue && headerValue === cookieValue)
}
