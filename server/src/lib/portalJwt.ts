import jwt from 'jsonwebtoken'

function portalSecret(): string {
  const s = process.env.PORTAL_JWT_SECRET
  if (!s || s.length < 16) {
    throw new Error('PORTAL_JWT_SECRET must be set (min 16 chars)')
  }
  return s
}

export interface VolunteerPortalClaims {
  typ: 'volunteer'
  sub: string
  ph: string
}

export interface HospitalPortalClaims {
  typ: 'hospital'
  sub: string
}

const SEC7D = 7 * 24 * 60 * 60
const SEC365D = 365 * 24 * 60 * 60

export function signVolunteerPortalToken(volunteerId: string, phoneE164: string): string {
  return jwt.sign({ typ: 'volunteer', sub: volunteerId, ph: phoneE164 }, portalSecret(), {
    expiresIn: SEC7D,
    algorithm: 'HS256',
  })
}

export function signHospitalPortalToken(hospitalId: string): string {
  return jwt.sign({ typ: 'hospital', sub: hospitalId }, portalSecret(), {
    expiresIn: SEC365D,
    algorithm: 'HS256',
  })
}

export function verifyVolunteerPortalToken(token: string): VolunteerPortalClaims | null {
  try {
    const p = jwt.verify(token, portalSecret(), { algorithms: ['HS256'] }) as jwt.JwtPayload
    if (p.typ !== 'volunteer' || typeof p.sub !== 'string' || typeof p.ph !== 'string') {
      return null
    }
    return { typ: 'volunteer', sub: p.sub, ph: p.ph }
  } catch {
    return null
  }
}

export function verifyHospitalPortalToken(token: string): HospitalPortalClaims | null {
  try {
    const p = jwt.verify(token, portalSecret(), { algorithms: ['HS256'] }) as jwt.JwtPayload
    if (p.typ !== 'hospital' || typeof p.sub !== 'string') {
      return null
    }
    return { typ: 'hospital', sub: p.sub }
  } catch {
    return null
  }
}
