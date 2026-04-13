import { Router } from 'express'
import twilio from 'twilio'
import { getTwilioUssdWebhookUrl } from '@/config/env'
import { asyncHandler } from '@/lib/asyncHandler'
import { logError } from '@/lib/logger'
import { normalizePhone } from '@/lib/phone'
import { fetchPatientForSos } from '@/services/patientQueries'
import { prisma } from '@/lib/prisma'
import { sendSMS } from '@/services/twilio'
import { triggerSos } from '@/services/sosService'

export const ussdRouter = Router()

const SMS_MENU =
  'MamaAlert — reply with a number:\n1 — I need help NOW\n2 — I am okay\n3 — Call my health worker'

function isTwilioSms(body: Record<string, unknown>): boolean {
  return typeof body.MessageSid === 'string'
}

function isTwilioVoice(body: Record<string, unknown>): boolean {
  return typeof body.CallSid === 'string' && typeof body.MessageSid !== 'string'
}

function sendSmsTwiml(res: import('express').Response, text: string): void {
  const twiml = new twilio.twiml.MessagingResponse()
  twiml.message(text)
  res.type('text/xml').send(twiml.toString())
}

function sendVoiceGather(res: import('express').Response): void {
  const actionUrl = getTwilioUssdWebhookUrl()
  const vr = new twilio.twiml.VoiceResponse()
  const gather = vr.gather({
    numDigits: 1,
    action: actionUrl,
    method: 'POST',
    timeout: 10,
  })
  gather.say(
    { voice: 'alice' },
    'Press 1 if you need help now. Press 2 if you are okay. Press 3 to request a call from your health worker.',
  )
  vr.say({ voice: 'alice' }, 'We did not receive a choice. Goodbye.')
  res.type('text/xml').send(vr.toString())
}

function sendVoiceSay(res: import('express').Response, text: string): void {
  const vr = new twilio.twiml.VoiceResponse()
  vr.say({ voice: 'alice' }, text)
  res.type('text/xml').send(vr.toString())
}

function sosErrorToVoiceMessage(code: number): string {
  if (code === 404) {
    return 'We could not find your registration. Contact your clinic.'
  }
  if (code === 409) {
    return 'An alert is already active. Help is being arranged.'
  }
  return 'Could not send alert. Please try again or call for help.'
}

function sosErrorToSmsMessage(code: number): string {
  if (code === 404) {
    return 'We could not find your registration. Contact your clinic.'
  }
  if (code === 409) {
    return 'An alert is already active. Help is being arranged.'
  }
  return 'Could not send alert. Please try again or call for help.'
}

ussdRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const body = req.body as Record<string, unknown>

    if (isTwilioSms(body)) {
      const from = typeof body.From === 'string' ? body.From : ''
      const text = typeof body.Body === 'string' ? body.Body.trim() : ''

      if (!from) {
        res.status(400).send('Bad Request')
        return
      }

      if (text === '') {
        sendSmsTwiml(res, SMS_MENU)
        return
      }

      if (text === '2') {
        sendSmsTwiml(res, 'Thank you. Stay safe.')
        return
      }

      if (text === '1') {
        try {
          const sosResult = await triggerSos({
            phone: normalizePhone(from),
            triggerMethod: 'ussd',
            incapacitationSuspected: true,
          })
          sendSmsTwiml(
            res,
            sosResult.duplicate
              ? 'An alert is already active. Help is being arranged.'
              : 'Help is on the way. Stay where you are.',
          )
        } catch (err) {
          logError('ussd: SOS failed (SMS)', { err: String(err) })
          const code =
            err && typeof err === 'object' && 'statusCode' in err
              ? (err as { statusCode: number }).statusCode
              : 500
          sendSmsTwiml(res, sosErrorToSmsMessage(code))
        }
        return
      }

      if (text === '3') {
        const row = await fetchPatientForSos(normalizePhone(from))
        if (!row) {
          sendSmsTwiml(res, 'We could not find your profile.')
          return
        }
        const hw = await prisma.healthWorker.findUnique({
          where: { userId: row.health_worker_id },
          select: { phone: true },
        })
        if (!hw?.phone) {
          sendSmsTwiml(res, 'No health worker phone on file.')
          return
        }
        try {
          await sendSMS(hw.phone, `USSD/SMS menu: ${row.name} requested a call.`)
          sendSmsTwiml(res, 'We sent a message to your health worker.')
        } catch (err) {
          logError('ussd: worker notify SMS failed (SMS path)', { err: String(err) })
          sendSmsTwiml(res, 'Could not reach your health worker. Try again later.')
        }
        return
      }

      sendSmsTwiml(res, 'Invalid choice. Reply 1, 2, or 3.')
      return
    }

    if (isTwilioVoice(body)) {
      const from = typeof body.From === 'string' ? body.From : ''
      const digits = typeof body.Digits === 'string' ? body.Digits.trim() : ''

      if (!from) {
        res.status(400).send('Bad Request')
        return
      }

      if (digits === '') {
        sendVoiceGather(res)
        return
      }

      const choice = digits.slice(0, 1)

      if (choice === '2') {
        sendVoiceSay(res, 'Thank you. Stay safe.')
        return
      }

      if (choice === '1') {
        try {
          const sosResult = await triggerSos({
            phone: normalizePhone(from),
            triggerMethod: 'ussd',
            incapacitationSuspected: true,
          })
          sendVoiceSay(
            res,
            sosResult.duplicate
              ? 'An alert is already active. Help is being arranged.'
              : 'Help is on the way. Stay where you are.',
          )
        } catch (err) {
          logError('ussd: SOS failed (Voice)', { err: String(err) })
          const code =
            err && typeof err === 'object' && 'statusCode' in err
              ? (err as { statusCode: number }).statusCode
              : 500
          sendVoiceSay(res, sosErrorToVoiceMessage(code))
        }
        return
      }

      if (choice === '3') {
        const row = await fetchPatientForSos(normalizePhone(from))
        if (!row) {
          sendVoiceSay(res, 'We could not find your profile.')
          return
        }
        const hw = await prisma.healthWorker.findUnique({
          where: { userId: row.health_worker_id },
          select: { phone: true },
        })
        if (!hw?.phone) {
          sendVoiceSay(res, 'No health worker phone on file.')
          return
        }
        try {
          await sendSMS(hw.phone, `USSD/Voice menu: ${row.name} requested a call.`)
          sendVoiceSay(res, 'We sent a message to your health worker.')
        } catch (err) {
          logError('ussd: worker notify SMS failed (Voice path)', { err: String(err) })
          sendVoiceSay(res, 'Could not reach your health worker. Try again later.')
        }
        return
      }

      sendVoiceSay(res, 'Invalid choice.')
      return
    }

    res.status(400).send('Unsupported webhook payload')
  }),
)
