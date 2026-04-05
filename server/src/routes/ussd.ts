import { Router } from 'express'
import { logError } from '@/lib/logger'
import { normalizePhone } from '@/lib/phone'
import { asyncHandler } from '@/lib/asyncHandler'
import { fetchPatientForSos } from '@/services/patientQueries'
import { supabaseAdmin } from '@/services/supabase'
import { sendSMS } from '@/services/twilio'
import { triggerSos } from '@/services/sosService'

export const ussdRouter = Router()

ussdRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const sessionId = typeof req.body.sessionId === 'string' ? req.body.sessionId : ''
    void sessionId
    const serviceCode = typeof req.body.serviceCode === 'string' ? req.body.serviceCode : ''
    void serviceCode
    const phoneNumber = typeof req.body.phoneNumber === 'string' ? req.body.phoneNumber : ''
    const text = typeof req.body.text === 'string' ? req.body.text : ''

    res.type('text/plain')

    if (text === '') {
      res.send(
        'CON 1. I need help NOW\n2. I am okay\n3. Call my health worker',
      )
      return
    }

    if (text === '2') {
      res.send('END Thank you. Stay safe.')
      return
    }

    if (text === '1') {
      try {
        await triggerSos({
          phone: normalizePhone(phoneNumber),
          triggerMethod: 'ussd',
          incapacitationSuspected: true,
        })
        res.send('END Help is on the way. Stay where you are.')
      } catch (err) {
        logError('ussd: SOS failed', { err: String(err) })
        const code =
          err && typeof err === 'object' && 'statusCode' in err
            ? (err as { statusCode: number }).statusCode
            : 500
        if (code === 404) {
          res.send('END We could not find your registration. Contact your clinic.')
          return
        }
        if (code === 409) {
          res.send('END An alert is already active. Help is being arranged.')
          return
        }
        res.send('END Could not send alert. Please try again or call for help.')
      }
      return
    }

    if (text === '3') {
      const row = await fetchPatientForSos(normalizePhone(phoneNumber))
      if (!row) {
        res.send('END We could not find your profile.')
        return
      }
      const { data: hw, error } = await supabaseAdmin
        .from('health_workers')
        .select('phone')
        .eq('user_id', row.health_worker_id)
        .maybeSingle()
      if (error || !hw?.phone) {
        res.send('END No health worker phone on file.')
        return
      }
      try {
        await sendSMS(hw.phone, `USSD: ${row.name} requested a call.`)
        res.send('END We sent a message to your health worker.')
      } catch (err) {
        logError('ussd: worker notify SMS failed', { err: String(err) })
        res.send('END Could not reach your health worker. Try again later.')
      }
      return
    }

    res.send('END Invalid choice.')
  }),
)
