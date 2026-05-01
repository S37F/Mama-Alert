import jwt from 'jsonwebtoken'
import type { SessionRole } from '@/lib/mamaAuth'

function sessionSecret(): string {
  const s = process.env.AUTH_SESSION_JWT_SECRET?.trim() || process.env.PORTAL_JWT_SECRET?.trim()
  if (!s || s.length < 16) {
    throw new Error('AUTH_SESSION_JWT_SECRET or PORTAL_JWT_SECRET must be set (min 16 chars)')
  }
  return s
}

export interface MamaSessionClaims {
  typ: 'mama_session'
  sub: string
  role: SessionRole
}

export function signMamaSessionToken(profileId: string, role: SessionRole): string {
  return jwt.sign({ typ: 'mama_session', sub: profileId, role }, sessionSecret(), {
    expiresIn: 7 * 24 * 60 * 60,
    algorithm: 'HS256',
  })
}

export function verifyMamaSessionToken(token: string): MamaSessionClaims | null {
  try {
    const p = jwt.verify(token, sessionSecret(), { algorithms: ['HS256'] }) as jwt.JwtPayload
    if (p.typ !== 'mama_session' || typeof p.sub !== 'string' || typeof p.role !== 'string') {
      return null
    }
    if (p.role !== 'patient' && p.role !== 'volunteer' && p.role !== 'health_worker' && p.role !== 'admin') {
      return null
    }
    return { typ: 'mama_session', sub: p.sub, role: p.role }
  } catch {
    return null
  }
}
