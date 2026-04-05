import { Router } from 'express'
import { asyncHandler } from '@/lib/asyncHandler'
import { logError } from '@/lib/logger'
import { requireAuth, requireHealthWorker } from '@/middleware/auth'
import { supabaseAdmin } from '@/services/supabase'

export const workerPortalRouter = Router()

workerPortalRouter.use(requireAuth)
workerPortalRouter.use(requireHealthWorker)

workerPortalRouter.get(
  '/patients',
  asyncHandler(async (req, res) => {
    const uid = req.authUserId
    if (!uid) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    const { data, error } = await supabaseAdmin
      .from('patients')
      .select('id, name, weeks_pregnant, risk_flags, last_anc_date, phone_primary')
      .eq('health_worker_id', uid)
      .order('name', { ascending: true })

    if (error) {
      logError('worker patients failed', { error: String(error) })
      res.status(500).json({ error: 'Failed to load patients' })
      return
    }

    const rows = (data ?? []).map((row) => {
      const lastAnc = typeof row.last_anc_date === 'string' ? row.last_anc_date : null
      let overdueAnc = false
      if (lastAnc) {
        const d = new Date(lastAnc)
        const days = (Date.now() - d.getTime()) / (24 * 60 * 60 * 1000)
        overdueAnc = days > 28
      }
      return {
        id: row.id,
        name: row.name,
        weeksPregnant: typeof row.weeks_pregnant === 'number' ? row.weeks_pregnant : null,
        riskFlags: Array.isArray(row.risk_flags) ? row.risk_flags : [],
        lastAncDate: lastAnc,
        overdueAnc,
        phonePrimary: typeof row.phone_primary === 'string' ? row.phone_primary : '',
      }
    })

    res.json({ patients: rows })
  }),
)

workerPortalRouter.get(
  '/volunteers',
  asyncHandler(async (req, res) => {
    const zoneId = req.healthWorker?.zone_id
    if (!zoneId) {
      res.json({ volunteers: [] })
      return
    }

    const { data, error } = await supabaseAdmin
      .from('volunteers')
      .select('id, name, skills, vehicle, max_radius_km, is_active, last_response_at')
      .eq('zone_id', zoneId)
      .order('name', { ascending: true })

    if (error) {
      logError('worker volunteers failed', { error: String(error) })
      res.status(500).json({ error: 'Failed to load volunteers' })
      return
    }

    res.json({ volunteers: data ?? [] })
  }),
)
