import { Router } from 'express'
import { z } from 'zod'
import { asyncHandler } from '@/lib/asyncHandler'
import { logError } from '@/lib/logger'
import { normalizePhone } from '@/lib/phone'
import {
  applyVolunteerNo,
  applyVolunteerYes,
  toVolunteerRow,
} from '@/services/volunteerReply'
import { supabaseAdmin } from '@/services/supabase'

export const volunteerPortalRouter = Router()

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

volunteerPortalRouter.get(
  '/feed',
  asyncHandler(async (req, res) => {
    const phoneRaw = req.query.phone
    if (typeof phoneRaw !== 'string' || phoneRaw.trim().length < 8) {
      res.status(400).json({ error: 'Missing or invalid phone' })
      return
    }
    const phone = normalizePhone(phoneRaw)

    const { data: volunteer, error: vErr } = await supabaseAdmin
      .from('volunteers')
      .select('id')
      .eq('phone', phone)
      .maybeSingle()

    if (vErr || !volunteer) {
      res.json({ items: [] })
      return
    }

    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const { data: rows, error } = await supabaseAdmin
      .from('alert_responses')
      .select(
        'id, response, sent_at, responded_at, alert_id, alerts ( id, status, triggered_at, patients ( id, name, landmark, weeks_pregnant ) )',
      )
      .eq('volunteer_id', volunteer.id)
      .gte('sent_at', since)
      .order('sent_at', { ascending: false })

    if (error) {
      logError('volunteer feed failed', { error: String(error) })
      res.status(500).json({ error: 'Failed to load feed' })
      return
    }

    const items: {
      responseId: string
      alertId: string
      status: string
      response: string | null
      triggeredAt: string
      patientFirstName: string
      landmark: string | null
      weeksPregnant: number | null
      distanceKm: number | null
    }[] = []

    for (const row of rows ?? []) {
      const al = row.alerts
      if (!isRecord(al)) {
        continue
      }
      const alertId = typeof al.id === 'string' ? al.id : null
      const status = typeof al.status === 'string' ? al.status : ''
      const triggeredAt = typeof al.triggered_at === 'string' ? al.triggered_at : ''
      const pRaw = al.patients
      if (!alertId || !triggeredAt) {
        continue
      }
      let patientFirstName = ''
      let landmark: string | null = null
      let weeksPregnant: number | null = null
      let patientId: string | null = null
      if (isRecord(pRaw)) {
        const name = typeof pRaw.name === 'string' ? pRaw.name : ''
        patientFirstName = name.split(/\s+/)[0] ?? name
        landmark = typeof pRaw.landmark === 'string' ? pRaw.landmark : null
        weeksPregnant = typeof pRaw.weeks_pregnant === 'number' ? pRaw.weeks_pregnant : null
        patientId = typeof pRaw.id === 'string' ? pRaw.id : null
      }

      let distanceKm: number | null = null
      if (patientId) {
        const { data: dist, error: dErr } = await supabaseAdmin.rpc('distance_volunteer_to_patient', {
          p_volunteer_id: volunteer.id,
          p_patient_id: patientId,
        })
        if (!dErr && typeof dist === 'number') {
          distanceKm = Math.round((dist / 1000) * 10) / 10
        }
      }

      items.push({
        responseId: row.id,
        alertId,
        status,
        response: typeof row.response === 'string' || row.response === null ? row.response : null,
        triggeredAt,
        patientFirstName,
        landmark,
        weeksPregnant,
        distanceKm,
      })
    }

    res.json({ items })
  }),
)

const responseBodySchema = z.object({
  phone: z.string().min(8).max(24),
  alertId: z.string().uuid(),
  response: z.enum(['YES', 'NO']),
})

volunteerPortalRouter.post(
  '/response',
  asyncHandler(async (req, res) => {
    const parsed = responseBodySchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() })
      return
    }
    const { phone, alertId, response } = parsed.data
    const normalized = normalizePhone(phone)

    const { data: volunteer, error: vErr } = await supabaseAdmin
      .from('volunteers')
      .select('id, name, phone, language, zone_id')
      .eq('phone', normalized)
      .maybeSingle()

    if (vErr || !volunteer) {
      res.status(404).json({ error: 'Volunteer not found' })
      return
    }

    const vol = toVolunteerRow(volunteer)

    const { data: ar, error: arErr } = await supabaseAdmin
      .from('alert_responses')
      .select('id, response')
      .eq('volunteer_id', vol.id)
      .eq('alert_id', alertId)
      .is('response', null)
      .maybeSingle()

    if (arErr || !ar) {
      res.status(404).json({ error: 'No pending response for this alert' })
      return
    }

    if (response === 'NO') {
      await applyVolunteerNo(ar.id)
      res.json({ success: true })
      return
    }

    const { data: alertRow } = await supabaseAdmin.from('alerts').select('status').eq('id', alertId).maybeSingle()
    if (alertRow?.status !== 'active') {
      res.status(409).json({ error: 'This alert is no longer accepting YES responses' })
      return
    }

    await applyVolunteerYes(vol, ar.id, alertId)
    res.json({ success: true })
  }),
)
