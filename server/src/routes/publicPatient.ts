import { Router } from 'express'
import { z } from 'zod'
import { asyncHandler } from '@/lib/asyncHandler'
import { normalizePhone } from '@/lib/phone'
import { fetchPatientForSos } from '@/services/patientQueries'

export const publicPatientRouter = Router()

const bodySchema = z.object({
  phone: z.string().min(8).max(24),
})

publicPatientRouter.post(
  '/patient-hints',
  asyncHandler(async (req, res) => {
    const parsed = bodySchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid payload' })
      return
    }
    const phone = normalizePhone(parsed.data.phone)
    const row = await fetchPatientForSos(phone)
    if (!row) {
      res.status(404).json({ error: 'Not found' })
      return
    }
    const firstName = row.name.split(/\s+/)[0] ?? row.name
    const language = row.language.split('-')[0] ?? 'en'
    res.json({ firstName, language })
  }),
)
