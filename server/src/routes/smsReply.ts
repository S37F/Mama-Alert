import { Router } from 'express'
import twilio from 'twilio'
import { logError } from '@/lib/logger'
import { bodyMatchesSosKeyword, getSmsSosKeywordSet } from '@/lib/smsSosKeywords'
import { normalizePhone } from '@/lib/phone'
import { asyncHandler } from '@/lib/asyncHandler'
import {
  applyVolunteerDone,
  applyVolunteerNo,
  applyVolunteerYes,
  findActivePendingResponseForVolunteer,
  toVolunteerRow,
} from '@/services/volunteerReply'
import { buildHospitalArrivedAck, buildSmsKeywordAck, buildVolunteerDoneAck } from '@/services/messageBuilder'
import { findHospitalIdBySmsFrom, resolveLatestOpenAlertForHospital } from '@/services/hospitalSmsReply'
import { fetchPatientForSos } from '@/services/patientQueries'
import { triggerSos } from '@/services/sosService'
import { prisma } from '@/lib/prisma'
import { validateTwilioSignature } from '@/middleware/twilioValidate'

export const smsReplyRouter = Router()

smsReplyRouter.use(validateTwilioSignature)

function twimlMessage(text: string): string {
  const twiml = new twilio.twiml.MessagingResponse()
  twiml.message(text)
  return twiml.toString()
}

smsReplyRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const fromRaw = req.body?.From
    const bodyRaw = req.body?.Body
    if (typeof fromRaw !== 'string' || typeof bodyRaw !== 'string') {
      res.type('text/xml').send('<Response></Response>')
      return
    }
    const from = normalizePhone(fromRaw)
    const answer = bodyRaw.trim().toUpperCase()
    const keywords = getSmsSosKeywordSet()

    const volunteer = await prisma.volunteer.findFirst({
      where: { phoneE164: from },
      select: { id: true, name: true, phone: true, language: true, zoneId: true },
    })

    if (volunteer) {
      const vol = toVolunteerRow(volunteer)
      const target = await findActivePendingResponseForVolunteer(vol.id)
      if (target) {
        if (answer === 'NO') {
          await applyVolunteerNo(target.responseId)
          res.type('text/xml').send('<Response></Response>')
          return
        }
        if (answer === 'YES') {
          try {
            await applyVolunteerYes(vol, target.responseId, target.alertId)
          } catch (err) {
            logError('sms-reply: applyVolunteerYes failed', { err: String(err) })
          }
          res.type('text/xml').send('<Response></Response>')
          return
        }
        res.type('text/xml').send('<Response></Response>')
        return
      }
      if (answer === 'DONE') {
        const ok = await applyVolunteerDone(vol.id)
        res
          .type('text/xml')
          .send(ok ? twimlMessage(buildVolunteerDoneAck(vol.language)) : '<Response></Response>')
        return
      }
    }

    if (answer === 'ARRIVED') {
      const hospitalId = await findHospitalIdBySmsFrom(from)
      if (hospitalId) {
        const ok = await resolveLatestOpenAlertForHospital(hospitalId)
        res
          .type('text/xml')
          .send(twimlMessage(buildHospitalArrivedAck(ok ? 'confirmed' : 'none')))
        return
      }
    }

    if (!bodyMatchesSosKeyword(bodyRaw, keywords)) {
      res.type('text/xml').send('<Response></Response>')
      return
    }

    let patientLang = 'en'
    try {
      const row = await fetchPatientForSos(from)
      if (!row) {
        res.type('text/xml').send(twimlMessage(buildSmsKeywordAck('en', 'notfound')))
        return
      }
      patientLang = row.language ?? 'en'
      await triggerSos({ phone: from, triggerMethod: 'sms' })
      res.type('text/xml').send(twimlMessage(buildSmsKeywordAck(patientLang, 'received')))
    } catch (err) {
      const code = typeof err === 'object' && err !== null && 'statusCode' in err ? (err as { statusCode?: number }).statusCode : undefined
      if (code === 409) {
        res.type('text/xml').send(twimlMessage(buildSmsKeywordAck(patientLang, 'duplicate')))
        return
      }
      if (code === 404) {
        res.type('text/xml').send(twimlMessage(buildSmsKeywordAck(patientLang, 'notfound')))
        return
      }
      logError('sms-reply: patient keyword SOS failed', { err: String(err) })
      res.type('text/xml').send(twimlMessage(buildSmsKeywordAck(patientLang, 'error')))
    }
  }),
)
