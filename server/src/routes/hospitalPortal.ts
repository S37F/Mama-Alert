import { Router } from 'express'
import { z } from 'zod'
import { asyncHandler } from '@/lib/asyncHandler'
import { logAudit, logError, logWarn } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
import { verifyHospitalPortalToken } from '@/lib/portalJwt'

export const hospitalPortalRouter = Router()

function requireHospitalPortal(req: import('express').Request, res: import('express').Response, next: import('express').NextFunction): void {
  const hdr = req.headers.authorization
  const token = hdr?.startsWith('Bearer ') ? hdr.slice(7) : undefined
  const claims = token ? verifyHospitalPortalToken(token) : null
  if (!claims) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  req.hospitalPortal = { hospitalId: claims.sub }
  next()
}

hospitalPortalRouter.use(requireHospitalPortal)

hospitalPortalRouter.get(
  '/inbox',
  asyncHandler(async (req, res) => {
    const hospitalId = req.hospitalPortal?.hospitalId
    if (!hospitalId) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    try {
      const rows = await prisma.alert.findMany({
        where: {
          nearestHospitalId: hospitalId,
          status: { in: ['active', 'volunteer_responding', 'at_facility'] },
        },
        orderBy: { triggeredAt: 'desc' },
        include: {
          patient: {
            select: {
              name: true,
              weeksPregnant: true,
              bloodType: true,
              riskFlags: true,
            },
          },
        },
      })

      const volIds = [...new Set(rows.map((r) => r.respondingVolunteerId).filter((id): id is string => !!id))]
      let volNames: Record<string, string> = {}
      if (volIds.length > 0) {
        const vols = await prisma.volunteer.findMany({
          where: { id: { in: volIds } },
          select: { id: true, name: true },
        })
        volNames = Object.fromEntries(vols.map((v) => [v.id, v.name]))
      }

      const items = rows.map((r) => {
        const pr = r.patient
        const rid = r.respondingVolunteerId
        const risk = pr?.riskFlags ?? []
        return {
          alertId: r.id,
          status: r.status,
          triggeredAt: r.triggeredAt.toISOString(),
          patientName: pr?.name ?? '',
          weeksPregnant: pr?.weeksPregnant ?? null,
          bloodType: pr?.bloodType ?? null,
          riskFlags: risk,
          volunteerName: typeof rid === 'string' && volNames[rid] ? volNames[rid] : null,
          etaMinutes: 25,
        }
      })

      res.json({ items })
    } catch (err) {
      logError('hospital inbox failed', { error: String(err) })
      res.status(500).json({ error: 'Failed to load inbox' })
    }
  }),
)

const ackSchema = z.object({
  alertId: z.string().uuid(),
  type: z.enum(['ready', 'more_info']),
})

hospitalPortalRouter.post(
  '/ack',
  asyncHandler(async (req, res) => {
    const hospitalId = req.hospitalPortal?.hospitalId
    if (!hospitalId) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }
    const parsed = ackSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() })
      return
    }
    const alert = await prisma.alert.findFirst({
      where: {
        id: parsed.data.alertId,
        nearestHospitalId: hospitalId,
        status: { in: ['active', 'volunteer_responding', 'at_facility'] },
      },
      select: { id: true },
    })
    if (!alert) {
      res.status(404).json({ error: 'Alert not found' })
      return
    }
    try {
      await prisma.hospitalAlertAck.create({
        data: {
          alertId: parsed.data.alertId,
          hospitalId,
          ackType: parsed.data.type,
        },
      })
    } catch (insErr) {
      logError('hospital ack insert failed', { error: String(insErr) })
      res.status(500).json({ error: 'Could not save acknowledgement' })
      return
    }
    logAudit('hospital_ack', { hospitalId, alertId: parsed.data.alertId, type: parsed.data.type })
    logWarn('hospital ack recorded', { alertId: parsed.data.alertId, type: parsed.data.type })
    res.json({ success: true })
  }),
)

const resolveSchema = z.object({
  alertId: z.string().uuid(),
})

hospitalPortalRouter.post(
  '/resolve',
  asyncHandler(async (req, res) => {
    const hospitalId = req.hospitalPortal?.hospitalId
    if (!hospitalId) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }
    const parsed = resolveSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() })
      return
    }
    const alertId = parsed.data.alertId
    const alert = await prisma.alert.findFirst({
      where: {
        id: alertId,
        nearestHospitalId: hospitalId,
        status: { in: ['active', 'volunteer_responding', 'at_facility'] },
      },
      select: { id: true },
    })
    if (!alert) {
      res.status(404).json({ error: 'Alert not found' })
      return
    }
    const now = new Date()
    try {
      await prisma.alert.update({
        where: { id: alertId },
        data: { status: 'resolved', resolvedAt: now, patientArrivedAt: now },
      })
    } catch (upErr) {
      logError('hospital resolve failed', { error: String(upErr) })
      res.status(500).json({ error: 'Could not resolve alert' })
      return
    }
    logAudit('hospital_resolve', { hospitalId, alertId })
    res.json({ success: true })
  }),
)
