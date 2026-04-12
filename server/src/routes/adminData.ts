import { Router } from 'express'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { asyncHandler } from '@/lib/asyncHandler'
import { logAudit, logError } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
import { signHospitalPortalToken } from '@/lib/portalJwt'
import { requireAdmin, requireAuth } from '@/middleware/auth'
import {
  rpcAdminActiveAlertPoints,
  rpcAdminHospitalsInZone,
  rpcAdminPatientsInZone,
  rpcAdminVolunteersInZone,
} from '@/services/db/rpc'
import { supabaseAuthAdmin } from '@/services/supabaseAuth'

export const adminDataRouter = Router()

adminDataRouter.use(requireAuth)
adminDataRouter.use(requireAdmin)

adminDataRouter.get(
  '/patients',
  asyncHandler(async (req, res) => {
    const zoneId = req.healthWorker?.zone_id
    try {
      const data = await prisma.patient.findMany({
        where: zoneId ? { zoneId } : {},
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          weeksPregnant: true,
          riskFlags: true,
          lastAncDate: true,
          healthWorkerId: true,
          healthWorker: { select: { name: true } },
        },
      })

      const rows = data.map((row) => {
        const hwName = row.healthWorker?.name ?? ''
        const lastAnc = row.lastAncDate ? row.lastAncDate.toISOString().slice(0, 10) : null
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
          weeksPregnant: row.weeksPregnant,
          riskFlags: row.riskFlags,
          lastAncDate: lastAnc,
          overdueAnc,
        }
      })

      res.json({ patients: rows })
    } catch (err) {
      logError('admin patients failed', { error: String(err) })
      res.status(500).json({ error: 'Failed to load patients' })
    }
  }),
)

adminDataRouter.get(
  '/volunteers',
  asyncHandler(async (req, res) => {
    const zoneId = req.healthWorker?.zone_id
    try {
      const data = await prisma.volunteer.findMany({
        where: zoneId ? { zoneId } : {},
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          skills: true,
          vehicle: true,
          maxRadiusKm: true,
          isActive: true,
          lastResponseAt: true,
        },
      })
      const volunteers = data.map((v) => ({
        id: v.id,
        name: v.name,
        skills: v.skills,
        vehicle: v.vehicle,
        max_radius_km: v.maxRadiusKm,
        is_active: v.isActive,
        last_response_at: v.lastResponseAt?.toISOString() ?? null,
      }))
      res.json({ volunteers })
    } catch (err) {
      logError('admin volunteers failed', { error: String(err) })
      res.status(500).json({ error: 'Failed to load volunteers' })
    }
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
    const vol = await prisma.volunteer.findUnique({
      where: { id },
      select: { id: true, zoneId: true },
    })

    if (!vol) {
      res.status(404).json({ error: 'Volunteer not found' })
      return
    }
    if (zoneId && vol.zoneId !== zoneId) {
      res.status(403).json({ error: 'Out of zone' })
      return
    }

    try {
      await prisma.volunteer.update({ where: { id }, data: { isActive: active } })
    } catch {
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

    try {
      const alerts = await prisma.alert.findMany({
        orderBy: { triggeredAt: 'desc' },
        take: 200,
        include: {
          patient: { select: { name: true, zoneId: true } },
        },
      })

      const filtered = alerts.filter((a) => {
        const p = a.patient
        if (!p) {
          return false
        }
        const pZone = p.zoneId
        if (!zoneId) {
          return true
        }
        return pZone === zoneId
      })

      const volIds = [
        ...new Set(
          filtered.map((r) => r.respondingVolunteerId).filter((id): id is string => typeof id === 'string'),
        ),
      ]
      let volNames: Record<string, string> = {}
      if (volIds.length > 0) {
        const vols = await prisma.volunteer.findMany({
          where: { id: { in: volIds } },
          select: { id: true, name: true },
        })
        volNames = Object.fromEntries(vols.map((v) => [v.id, v.name]))
      }

      let totalVolunteerConfirmMs = 0
      let volunteerConfirmCount = 0
      let totalResolveMs = 0
      let resolveCount = 0

      const rows = filtered.map((a) => {
        const rawP = a.patient
        const patientName = rawP?.name ?? ''
        const rid = a.respondingVolunteerId
        const volName = typeof rid === 'string' && volNames[rid] ? volNames[rid] : null
        const triggeredAt = a.triggeredAt.getTime()
        let volunteerConfirmMs: number | null = null
        if (a.volunteerConfirmedAt) {
          volunteerConfirmMs = a.volunteerConfirmedAt.getTime() - triggeredAt
          if (volunteerConfirmMs >= 0) {
            totalVolunteerConfirmMs += volunteerConfirmMs
            volunteerConfirmCount += 1
          }
        }
        let resolveTimeMs: number | null = null
        if (a.resolvedAt) {
          resolveTimeMs = a.resolvedAt.getTime() - triggeredAt
          if (resolveTimeMs >= 0) {
            totalResolveMs += resolveTimeMs
            resolveCount += 1
          }
        }
        return {
          id: a.id,
          patientName,
          triggeredAt: a.triggeredAt.toISOString(),
          volunteerConfirmMs,
          resolveTimeMs,
          volunteerName: volName,
          outcome: a.status,
        }
      })

      const avgVolunteerConfirmMs =
        volunteerConfirmCount > 0 ? Math.round(totalVolunteerConfirmMs / volunteerConfirmCount) : null
      const avgResolveMs = resolveCount > 0 ? Math.round(totalResolveMs / resolveCount) : null

      res.json({
        alerts: rows,
        avgVolunteerConfirmMs,
        avgResolveMs,
        /** @deprecated use avgResolveMs */
        avgResponseMs: avgResolveMs,
      })
    } catch (err) {
      logError('admin alerts history failed', { error: String(err) })
      res.status(500).json({ error: 'Failed to load alerts' })
    }
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

    try {
      const [patients, volunteers, hospitals, activeAlerts] = await Promise.all([
        rpcAdminPatientsInZone(zoneId),
        rpcAdminVolunteersInZone(zoneId),
        rpcAdminHospitalsInZone(zoneId),
        rpcAdminActiveAlertPoints(zoneId),
      ])
      res.json({ patients, volunteers, hospitals, activeAlerts })
    } catch (err) {
      logError('admin map-points failed', { error: String(err) })
      res.status(500).json({ error: 'Failed to load map data' })
    }
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
    const h = await prisma.hospital.findUnique({
      where: { id },
      select: { id: true, zoneId: true },
    })
    if (!h) {
      res.status(404).json({ error: 'Hospital not found' })
      return
    }
    if (zoneId && h.zoneId !== zoneId) {
      res.status(403).json({ error: 'Out of zone' })
      return
    }
    try {
      await prisma.hospital.update({
        where: { id },
        data: { receiveAlerts: parsed.data.receive_alerts },
      })
    } catch (uErr) {
      logError('admin hospital patch failed', { error: String(uErr) })
      res.status(500).json({ error: 'Update failed' })
      return
    }
    res.json({ success: true })
  }),
)

adminDataRouter.post(
  '/hospitals/:id/portal-token',
  asyncHandler(async (req, res) => {
    const id = req.params.id
    if (!id) {
      res.status(400).json({ error: 'Missing id' })
      return
    }
    const zoneId = req.healthWorker?.zone_id
    const h = await prisma.hospital.findUnique({
      where: { id },
      select: { id: true, zoneId: true },
    })
    if (!h) {
      res.status(404).json({ error: 'Hospital not found' })
      return
    }
    if (zoneId && h.zoneId !== zoneId) {
      res.status(403).json({ error: 'Out of zone' })
      return
    }
    const token = signHospitalPortalToken(h.id)
    logAudit('hospital_portal_token_issued', { hospitalId: h.id, adminZoneId: zoneId })
    res.status(201).json({ token })
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
    const zrow = await prisma.zone.findUnique({
      where: { id: zoneId },
      select: {
        id: true,
        name: true,
        escalationR1M: true,
        escalationR2M: true,
        escalationR3M: true,
        escalationDelayMs: true,
      },
    })
    if (!zrow) {
      logError('admin zone escalation get failed', { zoneId })
      res.status(500).json({ error: 'Failed to load zone' })
      return
    }
    res.json({
      zone: {
        id: zrow.id,
        name: zrow.name,
        escalation_r1_m: zrow.escalationR1M,
        escalation_r2_m: zrow.escalationR2M,
        escalation_r3_m: zrow.escalationR3M,
        escalation_delay_ms: zrow.escalationDelayMs,
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
    const data: Prisma.ZoneUpdateInput = {}
    if (parsed.data.escalation_r1_m !== undefined) {
      data.escalationR1M = parsed.data.escalation_r1_m
    }
    if (parsed.data.escalation_r2_m !== undefined) {
      data.escalationR2M = parsed.data.escalation_r2_m
    }
    if (parsed.data.escalation_r3_m !== undefined) {
      data.escalationR3M = parsed.data.escalation_r3_m
    }
    if (parsed.data.escalation_delay_ms !== undefined) {
      data.escalationDelayMs = parsed.data.escalation_delay_ms
    }
    if (Object.keys(data).length === 0) {
      res.status(400).json({ error: 'No fields to update' })
      return
    }
    try {
      await prisma.zone.update({ where: { id: zoneId }, data })
    } catch (uErr) {
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
    try {
      const data = await prisma.healthWorker.findMany({
        where: { zoneId },
        orderBy: { name: 'asc' },
        select: { userId: true, name: true, phone: true, accessLevel: true },
      })
      const healthWorkers = data.map((hw) => ({
        user_id: hw.userId,
        name: hw.name,
        phone: hw.phone,
        access_level: hw.accessLevel,
      }))
      res.json({ healthWorkers })
    } catch (err) {
      logError('admin health-workers list failed', { error: String(err) })
      res.status(500).json({ error: 'Failed to list health workers' })
    }
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
        ? `${process.env.CLIENT_URL.replace(/\/$/, '')}/register`
        : undefined
    const invitePayload =
      redirectTo !== undefined
        ? { data: { full_name: name }, redirectTo }
        : { data: { full_name: name } }
    const { data: invited, error: invErr } = await supabaseAuthAdmin.auth.admin.inviteUserByEmail(
      email,
      invitePayload,
    )
    if (invErr || !invited?.user?.id) {
      logError('admin invite failed', { error: String(invErr) })
      res.status(400).json({ error: invErr?.message ?? 'Invite failed' })
      return
    }
    const userId = invited.user.id
    try {
      await prisma.healthWorker.create({
        data: {
          userId,
          name,
          phone: phone ?? null,
          zoneId,
          accessLevel: 'health_worker',
        },
      })
    } catch (insErr) {
      logError('admin health_worker insert after invite failed', { error: String(insErr) })
      res.status(500).json({ error: 'Could not attach worker to zone (user may already be registered)' })
      return
    }
    res.status(201).json({ success: true, userId })
  }),
)
