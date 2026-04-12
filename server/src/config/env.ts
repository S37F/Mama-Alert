/**
 * Required at process start (see rules.md / CONTEXT.md).
 * Twilio vars are optional when TWILIO_MOCK is set (local dev).
 * USSD-style menus are handled via Twilio (SMS and/or Voice) at POST /api/ussd.
 */
const REQUIRED_CORE = [
  'DATABASE_URL',
  'DIRECT_DATABASE_URL',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_ANON_KEY',
  'CLIENT_URL',
  'SOS_SIGNING_SECRET',
  'PORTAL_JWT_SECRET',
] as const

const REQUIRED_TWILIO = ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_NUMBER'] as const

let validated = false

/** When true, SMS/voice are logged only and Twilio env vars are not required (local dev). */
export function isTwilioMock(): boolean {
  const v = process.env.TWILIO_MOCK
  return v === '1' || v === 'true' || v === 'yes'
}

export function validateEnv(): void {
  if (validated) {
    return
  }
  // Prisma schema defines directUrl; pooler-only deploys often set only DATABASE_URL.
  // Runtime queries use `url`; migrations should still use a direct Postgres URL when run via CLI/CI.
  const dbUrl = process.env.DATABASE_URL?.trim()
  if (!process.env.DIRECT_DATABASE_URL?.trim() && dbUrl) {
    process.env.DIRECT_DATABASE_URL = dbUrl
  }
  const missingCore = REQUIRED_CORE.filter((key) => !process.env[key]?.trim())
  const missingTwilio = isTwilioMock()
    ? []
    : REQUIRED_TWILIO.filter((key) => !process.env[key]?.trim())
  const missing = [...missingCore, ...missingTwilio]
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(', ')}. See server/.env.example and server/dev.env.example.`,
    )
  }
  const sos = process.env.SOS_SIGNING_SECRET ?? ''
  const portal = process.env.PORTAL_JWT_SECRET ?? ''
  if (sos.length < 16 || portal.length < 16) {
    throw new Error('SOS_SIGNING_SECRET and PORTAL_JWT_SECRET must each be at least 16 characters')
  }
  if (process.env.NODE_ENV === 'production' && isTwilioMock()) {
    throw new Error('TWILIO_MOCK cannot be enabled when NODE_ENV=production')
  }
  const validatedKeys = [...REQUIRED_CORE, ...(isTwilioMock() ? [] : [...REQUIRED_TWILIO])]
  console.log(
    `MamaAlert: environment OK — required keys present: ${validatedKeys.join(', ')} (DB via Prisma, auth via Supabase)`,
  )
  validated = true
}

/** Base URL Twilio used to POST the webhook (often your API host, not the PWA). */
export function getTwilioWebhookUrl(): string {
  const base = process.env.SERVER_PUBLIC_URL ?? process.env.CLIENT_URL ?? ''
  return `${base.replace(/\/$/, '')}/api/sms-reply`
}

/** Must match the exact URL configured for the Twilio number / Studio action hitting POST /api/ussd. */
export function getTwilioUssdWebhookUrl(): string {
  const base = process.env.SERVER_PUBLIC_URL ?? process.env.CLIENT_URL ?? ''
  return `${base.replace(/\/$/, '')}/api/ussd`
}
