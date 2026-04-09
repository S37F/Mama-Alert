/**
 * Required at process start (see rules.md / CONTEXT.md).
 * Twilio vars are optional when TWILIO_MOCK is set (local dev).
 * USSD-style menus are handled via Twilio (SMS and/or Voice) at POST /api/ussd.
 */
const REQUIRED_CORE = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_ANON_KEY',
  'CLIENT_URL',
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
  for (const key of REQUIRED_CORE) {
    if (!process.env[key] || process.env[key] === '') {
      throw new Error(`Missing required environment variable: ${key}`)
    }
  }
  if (!isTwilioMock()) {
    for (const key of REQUIRED_TWILIO) {
      if (!process.env[key] || process.env[key] === '') {
        throw new Error(`Missing required environment variable: ${key}`)
      }
    }
  }
  const validatedKeys = [...REQUIRED_CORE, ...(isTwilioMock() ? [] : [...REQUIRED_TWILIO])]
  console.log(`MamaAlert: environment OK — required keys present: ${validatedKeys.join(', ')}`)
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
