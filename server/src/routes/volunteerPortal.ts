import { randomInt } from 'crypto'
import { Router } from 'express'
import { z } from 'zod'
import { asyncHandler } from '@/lib/asyncHandler'
import { hashOtpCode } from '@/lib/otpHash'
import { logError } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
import { normalizePhone } from '@/lib/phone'
import { signVolunteerPortalToken, verifyVolunteerPortalToken } from '@/lib/portalJwt'
import { requireVolunteerPortal } from '@/middleware/volunteerPortalAuth'
import { volunteerOtpRequestRateLimit, volunteerSseRateLimit } from '@/middleware/rateLimiter'
import { registerVolunteerSse } from '@/services/volunteerSseHub'
import { rpcDistanceVolunteerToPatient } from '@/services/db/rpc'
import {
  applyVolunteerNo,
  applyVolunteerYes,
  toVolunteerRow,
} from '@/services/volunteerReply'
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
    const volunteer = await prisma.volunteer.findFirst({
      where: { phoneE164 },
      select: { id: true, phone: true },
    })

    if (!volunteer) {
      res.status(202).json({ ok: true })
      return
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
    const codeHash = hashOtpCode(code)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

    try {
      await prisma.volunteerOtpChallenge.create({
        data: {
          volunteerId: volunteer.id,
          codeHash,
          expiresAt,
        },
      })
    } catch (insErr) {
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
    const volunteer = await prisma.volunteer.findFirst({
      where: { phoneE164 },
      select: { id: true, phone: true, phoneE164: true, name: true, language: true, zoneId: true },
    })

    if (!volunteer) {
      res.status(401).json({ error: 'Invalid code' })
      return
    }

    const wantHash = hashOtpCode(parsed.data.code)
    const now = new Date()
    const rows = await prisma.volunteerOtpChallenge.findMany({
      where: {
        volunteerId: volunteer.id,
        consumedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, codeHash: true, expiresAt: true, consumedAt: true },
    })

    if (rows.length === 0) {
      res.status(401).json({ error: 'Invalid code' })
      return
    }

    const match = rows.find((r) => r.codeHash === wantHash)
    if (!match) {
      res.status(401).json({ error: 'Invalid code' })
      return
    }

    await prisma.volunteerOtpChallenge.update({
      where: { id: match.id },
      data: { consumedAt: new Date() },
    })

    const token = signVolunteerPortalToken(volunteer.id, volunteer.phoneE164 ?? phoneE164)
    res.json({
      access_token: token,
      volunteer: {
        id: volunteer.id,
        name: volunteer.name,
        language: volunteer.language,
        zone_id: volunteer.zoneId,
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

volunteerPortalRouter.get(
  '/feed',
  requireVolunteerPortal,
  asyncHandler(async (req, res) => {
    const volunteerId = req.volunteerPortal?.volunteerId
    if (!volunteerId) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    try {
      const rows = await prisma.alertResponse.findMany({
        where: { volunteerId, sentAt: { gte: since } },
        orderBy: { sentAt: 'desc' },
        include: {
          alert: {
            select: {
              id: true,
              status: true,
              triggeredAt: true,
              patient: {
                select: { id: true, name: true, landmark: true, weeksPregnant: true },
              },
            },
          },
        },
      })

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

      for (const row of rows) {
        const al = row.alert
        if (!al) {
          continue
        }
        const alertId = al.id
        const status = al.status
        const triggeredAt = al.triggeredAt.toISOString()
        const pRaw = al.patient
        if (!alertId || !triggeredAt) {
          continue
        }
        let patientFirstName = ''
        let landmark: string | null = null
        let weeksPregnant: number | null = null
        let patientId: string | null = null
        if (pRaw) {
          const name = pRaw.name
          patientFirstName = name.split(/\s+/)[0] ?? name
          landmark = pRaw.landmark
          weeksPregnant = pRaw.weeksPregnant
          patientId = pRaw.id
        }

        let distanceKm: number | null = null
        if (patientId) {
          try {
            const dist = await rpcDistanceVolunteerToPatient(volunteerId, patientId)
            if (typeof dist === 'number') {
              distanceKm = Math.round((dist / 1000) * 10) / 10
            }
          } catch {
            /* ignore */
          }
        }

        items.push({
          responseId: row.id,
          alertId,
          status,
          response: row.response,
          triggeredAt,
          patientFirstName,
          landmark,
          weeksPregnant,
          distanceKm,
        })
      }

      res.json({ items })
    } catch (err) {
      logError('volunteer feed failed', { error: String(err) })
      res.status(500).json({ error: 'Failed to load feed' })
    }
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

    const volunteer = await prisma.volunteer.findUnique({
      where: { id: volunteerId },
      select: { id: true, name: true, phone: true, language: true, zoneId: true, skills: true },
    })

    if (!volunteer) {
      res.status(404).json({ error: 'Volunteer not found' })
      return
    }

    const vol = toVolunteerRow(volunteer)

    const ar = await prisma.alertResponse.findFirst({
      where: { volunteerId: vol.id, alertId, response: null },
      select: { id: true, response: true },
    })

    if (!ar) {
      res.status(404).json({ error: 'No pending response for this alert' })
      return
    }

    if (response === 'NO') {
      await applyVolunteerNo(ar.id)
      res.json({ success: true })
      return
    }

    const alertRow = await prisma.alert.findUnique({
      where: { id: alertId },
      select: { status: true },
    })
    if (alertRow?.status !== 'active') {
      res.status(409).json({ error: 'This alert is no longer accepting YES responses' })
      return
    }

    const result = await applyVolunteerYes(vol, ar.id, alertId)
    if (!result.ok) {
      res.status(409).json({ error: 'Could not claim alert', reason: result.reason })
      return
    }
    res.json({ success: true })
  }),
)
