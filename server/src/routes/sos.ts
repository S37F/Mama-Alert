import { Router } from 'express'
import { z } from 'zod'
import { asyncHandler } from '@/lib/asyncHandler'
import { logAudit, logError } from '@/lib/logger'
import { verifySosPatientToken } from '@/lib/sosToken'
import { fetchPatientForSosById } from '@/services/patientQueries'
import { triggerSos, triggerSosFromPatientRow } from '@/services/sosService'

/** Duplicate-active-alert guard and volunteer fan-out live in `triggerSos` (sosService.ts). */
export const sosRouter = Router()

const legacyPwaPhone =
  process.env.ALLOW_LEGACY_PWA_SOS_PHONE_ONLY === 'true' ||
  process.env.ALLOW_LEGACY_PWA_SOS_PHONE_ONLY === '1'

const sosBodySchema = z
  .object({
    triggerMethod: z.enum(['pwa']),
    incapacitationSuspected: z.boolean().optional(),
    sosToken: z.string().min(24).optional(),
    phone: z.string().min(8).max(24).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.sosToken && val.sosToken.length >= 24) {
      return
    }
    if (legacyPwaPhone && val.phone && val.phone.length >= 8) {
      return
    }
    ctx.addIssue({
      code: 'custom',
      message:
        'PWA SOS requires a valid sosToken. Health workers receive it when registering a patient. For local demos only, set ALLOW_LEGACY_PWA_SOS_PHONE_ONLY=true and send phone.',
    })
  })

sosRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = sosBodySchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() })
      return
    }
    const { sosToken, phone, triggerMethod, incapacitationSuspected } = parsed.data
    try {
      if (sosToken) {
        const v = verifySosPatientToken(sosToken)
        if (!v) {
          res.status(401).json({ error: 'Invalid or expired SOS token' })
          return
        }
        const row = await fetchPatientForSosById(v.patientId)
        if (!row) {
          res.status(404).json({ error: 'Patient not found' })
          return
        }
        const result =
          incapacitationSuspected === undefined
            ? await triggerSosFromPatientRow(row, triggerMethod)
            : await triggerSosFromPatientRow(row, triggerMethod, incapacitationSuspected)
        logAudit('sos_triggered', { method: 'pwa', patientId: row.id, alertId: result.alertId })
        res.status(201).json(result)
        return
      }
      if (phone) {
        const result =
          incapacitationSuspected === undefined
            ? await triggerSos({ phone, triggerMethod })
            : await triggerSos({ phone, triggerMethod, incapacitationSuspected })
        logAudit('sos_triggered', { method: 'pwa_legacy_phone', alertId: result.alertId })
        res.status(201).json(result)
        return
      }
      res.status(400).json({ error: 'Missing SOS credentials' })
    } catch (err) {
      const code =
        err && typeof err === 'object' && 'statusCode' in err ? (err as { statusCode: number }).statusCode : 500
      if (code === 404) {
        res.status(404).json({ error: 'Patient not found' })
        return
      }
      if (code === 409) {
        res.status(409).json({ error: 'Duplicate alert within cooldown' })
        return
      }
      logError('sos route failed', { err: String(err) })
      res.status(500).json({ error: 'SOS failed' })
    }
  }),
)
