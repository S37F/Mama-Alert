import { Router } from 'express'
import { z } from 'zod'
import { asyncHandler } from '@/lib/asyncHandler'
import { logError } from '@/lib/logger'
import { requireAdmin, requireAuth } from '@/middleware/auth'
import { supabaseAdmin } from '@/services/supabase'

export const adminDataRouter = Router()

adminDataRouter.use(requireAuth)
adminDataRouter.use(requireAdmin)

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

adminDataRouter.get(
  '/patients',
  asyncHandler(async (req, res) => {
    const zoneId = req.healthWorker?.zone_id
    let q = supabaseAdmin
      .from('patients')
      .select(
        'id, name, weeks_pregnant, risk_flags, last_anc_date, health_worker_id, health_workers ( name )',
      )
      .order('name', { ascending: true })

    if (zoneId) {
      q = q.eq('zone_id', zoneId)
    }

    const { data, error } = await q

    if (error) {
      logError('admin patients failed', { error: String(error) })
      res.status(500).json({ error: 'Failed to load patients' })
      return
    }

    const rows = (data ?? []).map((row) => {
      const hw = row.health_workers
      const hwName = isRecord(hw) && typeof hw.name === 'string' ? hw.name : ''
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
        healthWorkerName: hwName,
        weeksPregnant: typeof row.weeks_pregnant === 'number' ? row.weeks_pregnant : null,
        riskFlags: Array.isArray(row.risk_flags) ? row.risk_flags : [],
        lastAncDate: lastAnc,
        overdueAnc,
      }
    })

    res.json({ patients: rows })
  }),
)

adminDataRouter.get(
  '/volunteers',
  asyncHandler(async (req, res) => {
    const zoneId = req.healthWorker?.zone_id
    let q = supabaseAdmin
      .from('volunteers')
      .select('id, name, skills, vehicle, max_radius_km, is_active, last_response_at')
      .order('name', { ascending: true })

    if (zoneId) {
      q = q.eq('zone_id', zoneId)
    }

    const { data, error } = await q

    if (error) {
      logError('admin volunteers failed', { error: String(error) })
      res.status(500).json({ error: 'Failed to load volunteers' })
      return
    }

    res.json({ volunteers: data ?? [] })
  }),
)

adminDataRouter.patch(
  '/volunteers/:id/active',
  asyncHandler(async (req, res) => {
    const id = req.params.id
    if (!id) {
      res.status(400).json({ error: 'Missing id' })
      return
    }
    const active = req.body?.active
    if (typeof active !== 'boolean') {
      res.status(400).json({ error: 'active must be boolean' })
      return
    }

    const zoneId = req.healthWorker?.zone_id
    const { data: vol, error: fErr } = await supabaseAdmin
      .from('volunteers')
      .select('id, zone_id')
      .eq('id', id)
      .maybeSingle()

    if (fErr || !vol) {
      res.status(404).json({ error: 'Volunteer not found' })
      return
    }
    if (zoneId && vol.zone_id !== zoneId) {
      res.status(403).json({ error: 'Out of zone' })
      return
    }

    const { error: uErr } = await supabaseAdmin.from('volunteers').update({ is_active: active }).eq('id', id)
    if (uErr) {
      res.status(500).json({ error: 'Update failed' })
      return
    }
    res.json({ success: true })
  }),
)

adminDataRouter.get(
  '/alerts-history',
  asyncHandler(async (req, res) => {
    const zoneId = req.healthWorker?.zone_id

    const { data: alerts, error } = await supabaseAdmin
      .from('alerts')
      .select(
        'id, status, triggered_at, resolved_at, responding_volunteer_id, patient_id, patients ( name, zone_id )',
      )
      .order('triggered_at', { ascending: false })
      .limit(200)

    if (error) {
      logError('admin alerts history failed', { error: String(error) })
      res.status(500).json({ error: 'Failed to load alerts' })
      return
    }

    const filtered = (alerts ?? []).filter((a) => {
      const p = a.patients
      if (!isRecord(p)) {
        return false
      }
      const pZone = typeof p.zone_id === 'string' ? p.zone_id : null
      if (!zoneId) {
        return true
      }
      return pZone === zoneId
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

    let totalResponseMs = 0
    let responseCount = 0

    const rows = filtered.map((a) => {
      const rawP = a.patients
      const p: Record<string, unknown> = isRecord(rawP) ? rawP : {}
      const patientName = typeof p.name === 'string' ? p.name : ''
      const rid = a.responding_volunteer_id
      const volName = typeof rid === 'string' && volNames[rid] ? volNames[rid] : null
      let responseMs: number | null = null
      if (a.triggered_at && a.resolved_at) {
        responseMs = new Date(a.resolved_at).getTime() - new Date(a.triggered_at).getTime()
        if (responseMs >= 0) {
          totalResponseMs += responseMs
          responseCount += 1
        }
      }
      return {
        id: a.id,
        patientName,
        triggeredAt: a.triggered_at,
        responseTimeMs: responseMs,
        volunteerName: volName,
        outcome: a.status,
      }
    })

    const avgResponseMs = responseCount > 0 ? Math.round(totalResponseMs / responseCount) : null

    res.json({ alerts: rows, avgResponseMs })
  }),
)

adminDataRouter.get(
  '/map-points',
  asyncHandler(async (req, res) => {
    const zoneId = req.healthWorker?.zone_id
    if (!zoneId) {
      res.json({ patients: [], volunteers: [], hospitals: [], activeAlerts: [] })
      return
    }

    const [pRes, vRes, hRes, aRes] = await Promise.all([
      supabaseAdmin.rpc('admin_patients_in_zone', { p_zone_id: zoneId }),
      supabaseAdmin.rpc('admin_volunteers_in_zone', { p_zone_id: zoneId }),
      supabaseAdmin.rpc('admin_hospitals_in_zone', { p_zone_id: zoneId }),
      supabaseAdmin.rpc('admin_active_alert_points', { p_zone_id: zoneId }),
    ])

    if (pRes.error) {
      logError('admin map patients', { error: String(pRes.error) })
    }
    if (vRes.error) {
      logError('admin map volunteers', { error: String(vRes.error) })
    }
    if (hRes.error) {
      logError('admin map hospitals', { error: String(hRes.error) })
    }
    if (aRes.error) {
      logError('admin map alerts', { error: String(aRes.error) })
    }

    res.json({
      patients: pRes.data ?? [],
      volunteers: vRes.data ?? [],
      hospitals: hRes.data ?? [],
      activeAlerts: aRes.data ?? [],
    })
  }),
)

const hospitalPatchSchema = z.object({
  receive_alerts: z.boolean(),
})

adminDataRouter.patch(
  '/hospitals/:id',
  asyncHandler(async (req, res) => {
    const id = req.params.id
    if (!id) {
      res.status(400).json({ error: 'Missing id' })
      return
    }
    const parsed = hospitalPatchSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() })
      return
    }
    const zoneId = req.healthWorker?.zone_id
    const { data: h, error: fErr } = await supabaseAdmin
      .from('hospitals')
      .select('id, zone_id')
      .eq('id', id)
      .maybeSingle()
    if (fErr || !h) {
      res.status(404).json({ error: 'Hospital not found' })
      return
    }
    if (zoneId && h.zone_id !== zoneId) {
      res.status(403).json({ error: 'Out of zone' })
      return
    }
    const { error: uErr } = await supabaseAdmin
      .from('hospitals')
      .update({ receive_alerts: parsed.data.receive_alerts })
      .eq('id', id)
    if (uErr) {
      logError('admin hospital patch failed', { error: String(uErr) })
      res.status(500).json({ error: 'Update failed' })
      return
    }
    res.json({ success: true })
  }),
)

const zoneEscalationSchema = z.object({
  escalation_r1_m: z.union([z.number().int().min(5000).max(50000), z.null()]).optional(),
  escalation_r2_m: z.union([z.number().int().min(5000).max(50000), z.null()]).optional(),
  escalation_r3_m: z.union([z.number().int().min(5000).max(50000), z.null()]).optional(),
  escalation_delay_ms: z.union([z.number().int().min(30000), z.null()]).optional(),
})

adminDataRouter.get(
  '/zone-escalation',
  asyncHandler(async (req, res) => {
    const zoneId = req.healthWorker?.zone_id
    if (!zoneId) {
      res.status(400).json({ error: 'Admin has no zone assigned' })
      return
    }
    const { data: zrow, error } = await supabaseAdmin
      .from('zones')
      .select('id, name, escalation_r1_m, escalation_r2_m, escalation_r3_m, escalation_delay_ms')
      .eq('id', zoneId)
      .maybeSingle()
    if (error || !zrow) {
      logError('admin zone escalation get failed', { error: String(error) })
      res.status(500).json({ error: 'Failed to load zone' })
      return
    }
    res.json({
      zone: {
        id: zrow.id,
        name: zrow.name,
        escalation_r1_m: zrow.escalation_r1_m,
        escalation_r2_m: zrow.escalation_r2_m,
        escalation_r3_m: zrow.escalation_r3_m,
        escalation_delay_ms: zrow.escalation_delay_ms,
      },
    })
  }),
)

adminDataRouter.patch(
  '/zone-escalation',
  asyncHandler(async (req, res) => {
    const zoneId = req.healthWorker?.zone_id
    if (!zoneId) {
      res.status(400).json({ error: 'Admin has no zone assigned' })
      return
    }
    const parsed = zoneEscalationSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() })
      return
    }
    const patch: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(parsed.data)) {
      if (v !== undefined) {
        patch[k] = v
      }
    }
    if (Object.keys(patch).length === 0) {
      res.status(400).json({ error: 'No fields to update' })
      return
    }
    const { error: uErr } = await supabaseAdmin.from('zones').update(patch).eq('id', zoneId)
    if (uErr) {
      logError('admin zone escalation patch failed', { error: String(uErr) })
      res.status(500).json({ error: 'Update failed' })
      return
    }
    res.json({ success: true })
  }),
)

const hwInviteSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(200),
  phone: z.string().max(40).optional(),
})

adminDataRouter.get(
  '/health-workers',
  asyncHandler(async (req, res) => {
    const zoneId = req.healthWorker?.zone_id
    if (!zoneId) {
      res.status(400).json({ error: 'Admin has no zone assigned' })
      return
    }
    const { data, error } = await supabaseAdmin
      .from('health_workers')
      .select('user_id, name, phone, access_level')
      .eq('zone_id', zoneId)
      .order('name', { ascending: true })
    if (error) {
      logError('admin health-workers list failed', { error: String(error) })
      res.status(500).json({ error: 'Failed to list health workers' })
      return
    }
    res.json({ healthWorkers: data ?? [] })
  }),
)

adminDataRouter.post(
  '/health-workers/invite',
  asyncHandler(async (req, res) => {
    const zoneId = req.healthWorker?.zone_id
    if (!zoneId) {
      res.status(400).json({ error: 'Admin has no zone assigned' })
      return
    }
    const parsed = hwInviteSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() })
      return
    }
    const { email, name, phone } = parsed.data
    const redirectTo =
      typeof process.env.CLIENT_URL === 'string' && process.env.CLIENT_URL.length > 0
        ? `${process.env.CLIENT_URL.replace(/\/$/, '')}/login`
        : undefined
    const { data: invited, error: invErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: name },
      redirectTo,
    })
    if (invErr || !invited?.user?.id) {
      logError('admin invite failed', { error: String(invErr) })
      res.status(400).json({ error: invErr?.message ?? 'Invite failed' })
      return
    }
    const userId = invited.user.id
    const { error: insErr } = await supabaseAdmin.from('health_workers').insert({
      user_id: userId,
      name,
      phone: phone ?? null,
      zone_id: zoneId,
      access_level: 'health_worker',
    })
    if (insErr) {
      logError('admin health_worker insert after invite failed', { error: String(insErr) })
      res.status(500).json({ error: 'Could not attach worker to zone (user may already be registered)' })
      return
    }
    res.status(201).json({ success: true, userId })
  }),
)
