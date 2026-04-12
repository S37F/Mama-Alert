import { Router } from 'express'
import { asyncHandler } from '@/lib/asyncHandler'
import { logError } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireHealthWorker } from '@/middleware/auth'

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

    try {
      const data = await prisma.patient.findMany({
        where: { healthWorkerId: uid },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          weeksPregnant: true,
          riskFlags: true,
          lastAncDate: true,
          phonePrimary: true,
        },
      })

      const rows = data.map((row) => {
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
          weeksPregnant: row.weeksPregnant,
          riskFlags: row.riskFlags,
          lastAncDate: lastAnc,
          overdueAnc,
          phonePrimary: row.phonePrimary,
        }
      })

      res.json({ patients: rows })
    } catch (err) {
      logError('worker patients failed', { error: String(err) })
      res.status(500).json({ error: 'Failed to load patients' })
    }
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

    try {
      const data = await prisma.volunteer.findMany({
        where: { zoneId },
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
      logError('worker volunteers failed', { error: String(err) })
      res.status(500).json({ error: 'Failed to load volunteers' })
    }
  }),
)
