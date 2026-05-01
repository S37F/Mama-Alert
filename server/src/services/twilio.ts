import type { Request } from 'express'
import twilio from 'twilio'
import { getTwilioStatusWebhookUrl, getTwilioUssdWebhookUrl, getTwilioWebhookUrl, isTwilioMock } from '@/config/env'
import { splitSmsTwoParts } from '@/lib/smsLength'
import { logWarn } from '@/lib/logger'
import { recordOutboundMessage } from '@/services/observability'

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const fromNumber = process.env.TWILIO_NUMBER

function getClient() {
  if (!accountSid || !authToken) {
    throw new Error('Twilio credentials not configured')
  }
  return twilio(accountSid, authToken)
}

export interface MessageContext {
  alertId?: string | null
  channel?: 'sms' | 'voice'
}

export async function sendSMS(to: string, body: string, context: MessageContext = {}): Promise<void> {
  if (isTwilioMock()) {
    logWarn('[TWILIO_MOCK] sendSMS', { to, bodyPreview: body.slice(0, 80) })
    await recordOutboundMessage({
      alertId: context.alertId ?? null,
      recipient: to,
      provider: 'twilio_mock',
      channel: context.channel ?? 'sms',
      status: 'sent',
      bodyPreview: body.slice(0, 120),
    })
    return
  }
  const client = getClient()
  if (!fromNumber) {
    throw new Error('TWILIO_NUMBER not configured')
  }
  try {
    const msg = await client.messages.create({
      to,
      from: fromNumber,
      body,
      statusCallback: getTwilioStatusWebhookUrl(),
    })
    await recordOutboundMessage({
      alertId: context.alertId ?? null,
      recipient: to,
      provider: 'twilio',
      providerMessageId: msg.sid,
      channel: context.channel ?? 'sms',
      status: msg.status ?? 'queued',
      bodyPreview: body.slice(0, 120),
    })
  } catch (err) {
    await recordOutboundMessage({
      alertId: context.alertId ?? null,
      recipient: to,
      provider: 'twilio',
      channel: context.channel ?? 'sms',
      status: 'failed',
      error: String(err).slice(0, 1000),
      bodyPreview: body.slice(0, 120),
    })
    throw err
  }
}

/** Up to two GSM segments (~306 chars total) as separate Twilio messages. */
export async function sendSmsMultipart(to: string, body: string, context: MessageContext = {}): Promise<void> {
  const parts = splitSmsTwoParts(body)
  for (const part of parts) {
    if (part.length > 0) {
      await sendSMS(to, part, context)
    }
  }
}

export async function sendVoiceConfirmation(to: string, message: string, context: MessageContext = {}): Promise<void> {
  if (isTwilioMock()) {
    logWarn('[TWILIO_MOCK] sendVoiceConfirmation', { to, messagePreview: message.slice(0, 80) })
    await recordOutboundMessage({
      alertId: context.alertId ?? null,
      recipient: to,
      provider: 'twilio_mock',
      channel: 'voice',
      status: 'sent',
      bodyPreview: message.slice(0, 120),
    })
    return
  }
  const client = getClient()
  if (!fromNumber) {
    throw new Error('TWILIO_NUMBER not configured')
  }
  const twiml = new twilio.twiml.VoiceResponse()
  twiml.say({ voice: 'alice' }, message)
  try {
    const call = await client.calls.create({
      to,
      from: fromNumber,
      twiml: twiml.toString(),
    })
    await recordOutboundMessage({
      alertId: context.alertId ?? null,
      recipient: to,
      provider: 'twilio',
      providerMessageId: call.sid,
      channel: 'voice',
      status: call.status ?? 'queued',
      bodyPreview: message.slice(0, 120),
    })
  } catch (err) {
    await recordOutboundMessage({
      alertId: context.alertId ?? null,
      recipient: to,
      provider: 'twilio',
      channel: 'voice',
      status: 'failed',
      error: String(err).slice(0, 1000),
      bodyPreview: message.slice(0, 120),
    })
    throw err
  }
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

export function validateStatusWebhookSignature(req: Request): boolean {
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
  return twilio.validateRequest(authToken, signature, getTwilioStatusWebhookUrl(), req.body)
}
