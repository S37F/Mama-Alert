import { extractFamilyPhones } from '@/lib/emergencyContacts'
import { logError } from '@/lib/logger'
import { buildFamilyRegistrationWelcomeSms } from '@/services/messageBuilder'
import { sendSmsMultipart } from '@/services/twilio'

/** When `SEND_FAMILY_STATUS_SMS_ON_REGISTER=true`, notify emergency contacts with the read-only status link. */
export function isFamilyWelcomeSmsEnabled(): boolean {
  const v = process.env.SEND_FAMILY_STATUS_SMS_ON_REGISTER
  return v === '1' || v === 'true' || v === 'yes'
}

export async function sendFamilyWelcomeSmsIfEnabled(
  patientName: string,
  emergencyContacts: unknown,
  statusToken: string,
  language: string,
): Promise<void> {
  if (!isFamilyWelcomeSmsEnabled()) {
    return
  }
  const phones = extractFamilyPhones(emergencyContacts)
  if (phones.length === 0) {
    return
  }
  const firstName = patientName.split(/\s+/)[0] ?? patientName
  const lang = language.split('-')[0] ?? 'en'
  const body = buildFamilyRegistrationWelcomeSms(firstName, statusToken, lang)
  for (const to of phones) {
    try {
      await sendSmsMultipart(to, body)
    } catch (err) {
      logError('family-welcome-sms: send failed', { err: String(err), to: to.slice(0, 6) })
    }
  }
}
