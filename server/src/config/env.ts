/**
 * Required at process start (see rules.md / CONTEXT.md).
 * Twilio vars are optional when TWILIO_MOCK is set (local dev).
 * USSD-style menus are handled via Twilio (SMS and/or Voice) at POST /api/ussd.
 */
const REQUIRED_CORE = [
  'DATABASE_URL',
  'DIRECT_DATABASE_URL',
  'CLIENT_URL',
  'SOS_SIGNING_SECRET',
  'PORTAL_JWT_SECRET',
  'ADMIN_SIGNUP_CODE',
] as const

const REQUIRED_TWILIO = ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_NUMBER'] as const

let validated = false

/**
 * Supabase transaction pooler (PgBouncer, port 6543): Prisma uses prepared statements by default,
 * which breaks on pooled connections ("prepared statement s0 already exists"). Appending
 * `pgbouncer=true` disables that for the client URL.
 */
function ensurePgbouncerModeForTransactionPoolerDatabaseUrl(): void {
  const raw = process.env.DATABASE_URL?.trim()
  if (!raw || raw.toLowerCase().includes('pgbouncer=true')) {
    return
  }
  try {
    const normalized = raw.replace(/^postgresql:/i, 'http:').replace(/^postgres:/i, 'http:')
    const u = new URL(normalized)
    const port = u.port || '5432'
    const host = u.hostname.toLowerCase()
    const isSupabaseTxPooler = host.includes('pooler.supabase.com') || port === '6543'
    if (!isSupabaseTxPooler) {
      return
    }
    const glue = raw.includes('?') ? '&' : '?'
    process.env.DATABASE_URL = `${raw}${glue}pgbouncer=true`
  } catch {
    // leave DATABASE_URL unchanged if unparsable
  }
}

/** When true, SMS/voice are logged only and Twilio env vars are not required (local dev). */
export function isTwilioMock(): boolean {
  const v = process.env.TWILIO_MOCK
  return v === '1' || v === 'true' || v === 'yes'
}

export function validateEnv(): void {
  if (validated) {
    return
  }

  ensurePgbouncerModeForTransactionPoolerDatabaseUrl()

  const dbUrl = process.env.DATABASE_URL?.trim()
  if (!process.env.DIRECT_DATABASE_URL?.trim() && dbUrl) {
    process.env.DIRECT_DATABASE_URL = dbUrl
  }

  const missingCore = REQUIRED_CORE.filter((key) => !process.env[key]?.trim())
  const missingTwilio = isTwilioMock() ? [] : REQUIRED_TWILIO.filter((key) => !process.env[key]?.trim())
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

  if (process.env.ADMIN_SIGNUP_CODE?.trim().length === 0) {
    throw new Error('Missing ADMIN_SIGNUP_CODE - admin sign-up will be disabled.')
  }

  if (process.env.NODE_ENV === 'production' && isTwilioMock()) {
    throw new Error('TWILIO_MOCK cannot be enabled when NODE_ENV=production')
  }

  const validatedKeys = [...REQUIRED_CORE, ...(isTwilioMock() ? [] : [...REQUIRED_TWILIO])]
  console.log(
    `MamaAlert: environment OK - required keys present: ${validatedKeys.join(', ')} (DB via Prisma, phone-only auth active)`,
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
