import AfricasTalking from 'africastalking'

function getSmsService() {
  const apiKey = process.env.AT_API_KEY
  const username = process.env.AT_USERNAME
  if (!apiKey || !username) {
    throw new Error("Africa's Talking credentials not configured")
  }
  return AfricasTalking({ apiKey, username }).SMS
}

export async function sendSMS(to: string, message: string): Promise<void> {
  const sms = getSmsService()
  await sms.send({ to: [to], message, enqueue: true })
}

export function handleUSSDSession(
  _sessionId: string,
  _phoneNumber: string,
  text: string,
): string {
  if (text === '') {
    return 'CON 1. I need help NOW\n2. I am okay\n3. Call my health worker'
  }
  if (text === '2') {
    return 'END Thank you. Stay safe.'
  }
  if (text === '1' || text === '3') {
    return 'END Session will connect in Phase 2.'
  }
  return 'END Invalid choice.'
}
