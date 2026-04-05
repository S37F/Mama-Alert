import { Router } from 'express'
import { asyncHandler } from '@/lib/asyncHandler'
import { logError } from '@/lib/logger'
import { requireAuth } from '@/middleware/auth'
import { supabaseAdmin } from '@/services/supabase'

export const alertsRouter = Router()

alertsRouter.use(requireAuth)

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

alertsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const zoneId = req.healthWorker?.zone_id
    const uid = req.authUserId
    if (!uid) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    const { data: rows, error } = await supabaseAdmin
      .from('alerts')
      .select(
        'id, status, priority, triggered_at, patient_id, responding_volunteer_id, patients (name, landmark, weeks_pregnant, zone_id, health_worker_id)',
      )
      .in('status', ['active', 'volunteer_responding', 'at_facility'])
      .order('triggered_at', { ascending: false })

    if (error) {
      logError('alerts list failed', { error: String(error) })
      res.status(500).json({ error: 'Failed to load alerts' })
      return
    }

    const filtered = (rows ?? []).filter((row) => {
      const p = row.patients
      if (!isRecord(p)) {
        return false
      }
      const pZone = typeof p.zone_id === 'string' ? p.zone_id : null
      const pHw = typeof p.health_worker_id === 'string' ? p.health_worker_id : null
      if (req.healthWorker?.access_level === 'admin') {
        return zoneId !== null && zoneId !== undefined && pZone === zoneId
      }
      if (zoneId && pZone === zoneId) {
        return true
      }
      return pHw === uid
    })

    const volIds = [
      ...new Set(
        filtered
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

    const out = filtered.map((r) => {
      const p: Record<string, unknown> = isRecord(r.patients) ? r.patients : {}
      const rid = r.responding_volunteer_id
      return {
        id: r.id,
        status: r.status,
        priority: r.priority,
        triggered_at: r.triggered_at,
        patient: {
          name: typeof p.name === 'string' ? p.name : '',
          landmark: typeof p.landmark === 'string' ? p.landmark : null,
          weeks_pregnant: typeof p.weeks_pregnant === 'number' ? p.weeks_pregnant : null,
        },
        responding_volunteer_name:
          typeof rid === 'string' && volNames[rid] ? volNames[rid] : null,
      }
    })

    res.json(out)
  }),
)

alertsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = req.params.id
    if (!id) {
      res.status(400).json({ error: 'Missing id' })
      return
    }
    const uid = req.authUserId
    const zoneId = req.healthWorker?.zone_id

    const { data: alert, error } = await supabaseAdmin
      .from('alerts')
      .select('*, patients (*)')
      .eq('id', id)
      .maybeSingle()

    if (error || !alert) {
      res.status(404).json({ error: 'Alert not found' })
      return
    }

    const { data: responses } = await supabaseAdmin
      .from('alert_responses')
      .select('id, alert_id, volunteer_id, response, sent_at, responded_at, wave_number, volunteers (id, name, phone)')
      .eq('alert_id', id)

    const pRaw = alert.patients
    if (!isRecord(pRaw)) {
      res.status(404).json({ error: 'Alert not found' })
      return
    }
    const pZone = typeof pRaw.zone_id === 'string' ? pRaw.zone_id : null
    const pHw = typeof pRaw.health_worker_id === 'string' ? pRaw.health_worker_id : null
    const allowedAdmin = req.healthWorker?.access_level === 'admin' && zoneId === pZone
    const allowedHw = pHw === uid || (zoneId !== null && zoneId !== undefined && pZone === zoneId)
    if (!allowedAdmin && !allowedHw) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }

    res.json({ ...alert, alert_responses: responses ?? [] })
  }),
)

alertsRouter.patch(
  '/:id/resolve',
  asyncHandler(async (req, res) => {
    const id = req.params.id
    if (!id) {
      res.status(400).json({ error: 'Missing id' })
      return
    }
    const uid = req.authUserId
    const zoneId = req.healthWorker?.zone_id

    const { data: alert, error: fetchErr } = await supabaseAdmin
      .from('alerts')
      .select('id, patient_id, patients (zone_id, health_worker_id)')
      .eq('id', id)
      .maybeSingle()

    if (fetchErr || !alert) {
      res.status(404).json({ error: 'Alert not found' })
      return
    }
    const pr = alert.patients
    if (!isRecord(pr)) {
      res.status(404).json({ error: 'Alert not found' })
      return
    }
    const pZone = typeof pr.zone_id === 'string' ? pr.zone_id : null
    const pHw = typeof pr.health_worker_id === 'string' ? pr.health_worker_id : null
    const allowedAdmin = req.healthWorker?.access_level === 'admin' && zoneId === pZone
    const allowedHw = pHw === uid || (zoneId !== null && zoneId !== undefined && pZone === zoneId)
    if (!allowedAdmin && !allowedHw) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }

    const now = new Date().toISOString()
    const { error: upErr } = await supabaseAdmin
      .from('alerts')
      .update({ status: 'resolved', resolved_at: now })
      .eq('id', id)

    if (upErr) {
      logError('alert resolve failed', { error: String(upErr) })
      res.status(500).json({ error: 'Could not resolve alert' })
      return
    }

    res.json({ success: true })
  }),
)
