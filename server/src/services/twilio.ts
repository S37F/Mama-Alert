import type { Request } from 'express'
import twilio from 'twilio'
import { getTwilioUssdWebhookUrl, getTwilioWebhookUrl, isTwilioMock } from '@/config/env'
import { splitSmsTwoParts } from '@/lib/smsLength'
import { logWarn } from '@/lib/logger'

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const fromNumber = process.env.TWILIO_NUMBER

function getClient() {
  if (!accountSid || !authToken) {
    throw new Error('Twilio credentials not configured')
  }
  return twilio(accountSid, authToken)
}

export async function sendSMS(to: string, body: string): Promise<void> {
  if (isTwilioMock()) {
    logWarn('[TWILIO_MOCK] sendSMS', { to, bodyPreview: body.slice(0, 80) })
    return
  }
  const client = getClient()
  if (!fromNumber) {
    throw new Error('TWILIO_NUMBER not configured')
  }
  await client.messages.create({ to, from: fromNumber, body })
}

/** Up to two GSM segments (~306 chars total) as separate Twilio messages. */
export async function sendSmsMultipart(to: string, body: string): Promise<void> {
  const parts = splitSmsTwoParts(body)
  for (const part of parts) {
    if (part.length > 0) {
      await sendSMS(to, part)
    }
  }
}

export async function sendVoiceConfirmation(to: string, message: string): Promise<void> {
  if (isTwilioMock()) {
    logWarn('[TWILIO_MOCK] sendVoiceConfirmation', { to, messagePreview: message.slice(0, 80) })
    return
  }
  const client = getClient()
  if (!fromNumber) {
    throw new Error('TWILIO_NUMBER not configured')
  }
  const twiml = new twilio.twiml.VoiceResponse()
  twiml.say({ voice: 'alice' }, message)
  await client.calls.create({
    to,
    from: fromNumber,
    twiml: twiml.toString(),
  })
}

export function validateWebhookSignature(req: Request): boolean {
  if (isTwilioMock()) {
    return true
  }
  if (!authToken) {
    return false
  }
  const signature = req.headers['x-twilio-signature']
  if (typeof signature !== 'string') {
    return false
  }
  const url = getTwilioWebhookUrl()
  return twilio.validateRequest(authToken, signature, url, req.body)
}

export function validateUssdWebhookSignature(req: Request): boolean {
  if (isTwilioMock()) {
    return true
  }
  if (!authToken) {
    return false
  }
  const signature = req.headers['x-twilio-signature']
  if (typeof signature !== 'string') {
    return false
  }
  const url = getTwilioUssdWebhookUrl()
  return twilio.validateRequest(authToken, signature, url, req.body)
}
