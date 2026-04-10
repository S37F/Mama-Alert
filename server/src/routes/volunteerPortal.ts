import { randomInt } from 'crypto'
import { Router } from 'express'
import { z } from 'zod'
import { asyncHandler } from '@/lib/asyncHandler'
import { hashOtpCode } from '@/lib/otpHash'
import { logError } from '@/lib/logger'
import { normalizePhone } from '@/lib/phone'
import { signVolunteerPortalToken, verifyVolunteerPortalToken } from '@/lib/portalJwt'
import { requireVolunteerPortal } from '@/middleware/volunteerPortalAuth'
import { volunteerOtpRequestRateLimit, volunteerSseRateLimit } from '@/middleware/rateLimiter'
import { registerVolunteerSse } from '@/services/volunteerSseHub'
import {
  applyVolunteerNo,
  applyVolunteerYes,
  toVolunteerRow,
} from '@/services/volunteerReply'
import { supabaseAdmin } from '@/services/supabase'
import { sendSMS } from '@/services/twilio'

export const volunteerPortalRouter = Router()

const otpRequestSchema = z.object({
  phone: z.string().min(8).max(24),
})

volunteerPortalRouter.post(
  '/otp/request',
  volunteerOtpRequestRateLimit,
  asyncHandler(async (req, res) => {
    const parsed = otpRequestSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() })
      return
    }
    const phoneE164 = normalizePhone(parsed.data.phone)
    const { data: volunteer, error: vErr } = await supabaseAdmin
      .from('volunteers')
      .select('id, phone, phone_e164')
      .eq('phone_e164', phoneE164)
      .maybeSingle()

    if (vErr || !volunteer) {
      res.status(202).json({ ok: true })
      return
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
    const codeHash = hashOtpCode(code)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    const { error: insErr } = await supabaseAdmin.from('volunteer_otp_challenges').insert({
      volunteer_id: volunteer.id,
      code_hash: codeHash,
      expires_at: expiresAt,
    })
    if (insErr) {
      logError('volunteer-otp: insert challenge failed', { error: String(insErr) })
      res.status(500).json({ error: 'Could not start login' })
      return
    }

    try {
      await sendSMS(volunteer.phone, `MamaAlert login code: ${code}. Valid 10 minutes.`)
    } catch (err) {
      logError('volunteer-otp: SMS failed', { err: String(err) })
      res.status(500).json({ error: 'Could not send code' })
      return
    }

    res.status(202).json({ ok: true })
  }),
)

const otpVerifySchema = z.object({
  phone: z.string().min(8).max(24),
  code: z.string().regex(/^\d{4,8}$/),
})

volunteerPortalRouter.post(
  '/otp/verify',
  asyncHandler(async (req, res) => {
    const parsed = otpVerifySchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() })
      return
    }
    const phoneE164 = normalizePhone(parsed.data.phone)
    const { data: volunteer, error: vErr } = await supabaseAdmin
      .from('volunteers')
      .select('id, phone, phone_e164, name, language, zone_id')
      .eq('phone_e164', phoneE164)
      .maybeSingle()

    if (vErr || !volunteer) {
      res.status(401).json({ error: 'Invalid code' })
      return
    }

    const wantHash = hashOtpCode(parsed.data.code)
    const { data: rows, error: chErr } = await supabaseAdmin
      .from('volunteer_otp_challenges')
      .select('id, code_hash, expires_at, consumed_at')
      .eq('volunteer_id', volunteer.id)
      .is('consumed_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(5)

    if (chErr || !rows?.length) {
      res.status(401).json({ error: 'Invalid code' })
      return
    }

    const match = rows.find((r) => r.code_hash === wantHash)
    if (!match) {
      res.status(401).json({ error: 'Invalid code' })
      return
    }

    await supabaseAdmin.from('volunteer_otp_challenges').update({ consumed_at: new Date().toISOString() }).eq('id', match.id)

    const token = signVolunteerPortalToken(volunteer.id, volunteer.phone_e164 ?? phoneE164)
    res.json({
      access_token: token,
      volunteer: {
        id: volunteer.id,
        name: volunteer.name,
        language: volunteer.language,
        zone_id: volunteer.zone_id,
      },
    })
  }),
)

/** EventSource cannot send Authorization; pass JWT as `?access_token=` */
volunteerPortalRouter.get('/events', volunteerSseRateLimit, (req, res, next) => {
  const raw = req.query.access_token
  const token = typeof raw === 'string' ? raw : undefined
  const claims = token ? verifyVolunteerPortalToken(token) : null
  if (!claims) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  try {
    registerVolunteerSse(req, res, claims.sub)
  } catch (err) {
    next(err)
  }
})

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

volunteerPortalRouter.get(
  '/feed',
  requireVolunteerPortal,
  asyncHandler(async (req, res) => {
    const volunteerId = req.volunteerPortal?.volunteerId
    if (!volunteerId) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const { data: rows, error } = await supabaseAdmin
      .from('alert_responses')
      .select(
        'id, response, sent_at, responded_at, alert_id, alerts ( id, status, triggered_at, patients ( id, name, landmark, weeks_pregnant ) )',
      )
      .eq('volunteer_id', volunteerId)
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
          p_volunteer_id: volunteerId,
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
  alertId: z.string().uuid(),
  response: z.enum(['YES', 'NO']),
})

volunteerPortalRouter.post(
  '/response',
  requireVolunteerPortal,
  asyncHandler(async (req, res) => {
    const parsed = responseBodySchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() })
      return
    }
    const { alertId, response } = parsed.data
    const volunteerId = req.volunteerPortal?.volunteerId
    if (!volunteerId) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    const { data: volunteer, error: vErr } = await supabaseAdmin
      .from('volunteers')
      .select('id, name, phone, language, zone_id')
      .eq('id', volunteerId)
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
