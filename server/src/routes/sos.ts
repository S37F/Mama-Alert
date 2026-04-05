import { Router } from 'express'
import { z } from 'zod'
import { asyncHandler } from '@/lib/asyncHandler'
import { logError } from '@/lib/logger'
import { triggerSos } from '@/services/sosService'

export const sosRouter = Router()

const sosBodySchema = z.object({
  phone: z.string().min(8).max(20),
  triggerMethod: z.enum(['pwa', 'sms', 'ussd']),
  incapacitationSuspected: z.boolean().optional(),
})

sosRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = sosBodySchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() })
      return
    }
    try {
      const result = await triggerSos(parsed.data)
      res.status(201).json(result)
    } catch (err) {
      const code = err && typeof err === 'object' && 'statusCode' in err ? (err as { statusCode: number }).statusCode : 500
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
