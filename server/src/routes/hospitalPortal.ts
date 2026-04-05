import { Router } from 'express'
import { z } from 'zod'
import { asyncHandler } from '@/lib/asyncHandler'
import { logError, logWarn } from '@/lib/logger'
import { supabaseAdmin } from '@/services/supabase'

export const hospitalPortalRouter = Router()

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

hospitalPortalRouter.get(
  '/inbox',
  asyncHandler(async (req, res) => {
    const idRaw = req.query.hospitalId
    if (typeof idRaw !== 'string' || idRaw.length < 10) {
      res.status(400).json({ error: 'Missing or invalid hospitalId' })
      return
    }

    const { data: rows, error } = await supabaseAdmin
      .from('alerts')
      .select(
        'id, status, triggered_at, responding_volunteer_id, patients ( name, weeks_pregnant, blood_type, risk_flags )',
      )
      .eq('nearest_hospital_id', idRaw)
      .in('status', ['active', 'volunteer_responding', 'at_facility'])
      .order('triggered_at', { ascending: false })

    if (error) {
      logError('hospital inbox failed', { error: String(error) })
      res.status(500).json({ error: 'Failed to load inbox' })
      return
    }

    const volIds = [
      ...new Set(
        (rows ?? [])
          .map((r) => r.responding_volunteer_id)
          .filter((id): id is string => typeof id === 'string'),
      ),
    ]
    let volNames: Record<string, string> = {}
    if (volIds.length > 0) {
      const { data: vols } = await supabaseAdmin.from('volunteers').select('id, name').in('id', volIds)
      if (vols) {
        volNames = Object.fromEntries(vols.map((v) => [v.id, v.name]))
      }
    }

    const items = (rows ?? []).map((r) => {
      const pr: Record<string, unknown> = isRecord(r.patients) ? r.patients : {}
      const rid = r.responding_volunteer_id
      const risk = Array.isArray(pr.risk_flags) ? (pr.risk_flags as string[]) : []
      return {
        alertId: r.id,
        status: r.status,
        triggeredAt: r.triggered_at,
        patientName: typeof pr.name === 'string' ? pr.name : '',
        weeksPregnant: typeof pr.weeks_pregnant === 'number' ? pr.weeks_pregnant : null,
        bloodType: typeof pr.blood_type === 'string' ? pr.blood_type : null,
        riskFlags: risk,
        volunteerName: typeof rid === 'string' && volNames[rid] ? volNames[rid] : null,
        etaMinutes: 25,
      }
    })

    res.json({ items })
  }),
)

const ackSchema = z.object({
  alertId: z.string().uuid(),
  type: z.enum(['ready', 'more_info']),
})

hospitalPortalRouter.post(
  '/ack',
  asyncHandler(async (req, res) => {
    const parsed = ackSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() })
      return
    }
    logWarn('hospital ack recorded', { alertId: parsed.data.alertId, type: parsed.data.type })
    res.json({ success: true })
  }),
)
