import { createHmac, timingSafeEqual } from 'crypto'

function secret(): string {
  const s = process.env.SOS_SIGNING_SECRET
  if (!s || s.length < 16) {
    throw new Error('SOS_SIGNING_SECRET must be set (min 16 chars)')
  }
  return s
}

/** PWA SOS: HMAC-signed payload { v, pid, exp } (base64url). */
export function signSosPatientToken(patientId: string, ttlSeconds: number): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds
  const body = JSON.stringify({ v: 1, pid: patientId, exp })
  const b = Buffer.from(body).toString('base64url')
  const sig = createHmac('sha256', secret()).update(b).digest('base64url')
  return `${b}.${sig}`
}

export function verifySosPatientToken(token: string): { patientId: string } | null {
  try {
    const dot = token.lastIndexOf('.')
    if (dot <= 0) {
      return null
    }
    const b = token.slice(0, dot)
    const sig = token.slice(dot + 1)
    const expected = createHmac('sha256', secret()).update(b).digest('base64url')
    const a = Buffer.from(expected, 'utf8')
    const c = Buffer.from(sig, 'utf8')
    if (a.length !== c.length || !timingSafeEqual(a, c)) {
      return null
    }
    const payload = JSON.parse(Buffer.from(b, 'base64url').toString('utf8')) as {
      v?: number
      pid?: string
      exp?: number
    }
    if (payload.v !== 1 || typeof payload.pid !== 'string' || typeof payload.exp !== 'number') {
      return null
    }
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null
    }
    return { patientId: payload.pid }
  } catch {
    return null
  }
}
