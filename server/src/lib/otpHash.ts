import { createHmac } from 'crypto'

function pepper(): string {
  return process.env.OTP_CODE_PEPPER ?? process.env.PORTAL_JWT_SECRET ?? ''
}

export function hashOtpCode(code: string): string {
  const p = pepper()
  if (p.length < 8) {
    throw new Error('OTP_CODE_PEPPER or PORTAL_JWT_SECRET required for OTP')
  }
  return createHmac('sha256', p).update(code.trim()).digest('hex')
}
