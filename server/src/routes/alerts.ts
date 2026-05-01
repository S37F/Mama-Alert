import { Router } from 'express'
import { asyncHandler } from '@/lib/asyncHandler'
import { logError } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/middleware/auth'

export const alertsRouter = Router()

alertsRouter.use(requireAuth)

function patientToSnake(p: {
  id: string
  healthWorkerId: string
  zoneId: string | null
  name: string
  age: number | null
  phonePrimary: string
  phoneSecondary: string | null
  village: string | null
  landmark: string | null
  weeksPregnant: number | null
  dueDate: Date | null
  bloodType: string | null
  language: string
  statusToken: string
  riskFlags: string[]
  emergencyContacts: unknown
  patientStatus: string
  medicationName: string | null
  prevPregnancies: number | null
  prevBirths: number | null
  prevCsection: boolean
  lastAncDate: Date | null
  createdAt: Date
  updatedAt: Date
}): Record<string, unknown> {
  return {
    id: p.id,
    health_worker_id: p.healthWorkerId,
    zone_id: p.zoneId,
    name: p.name,
    age: p.age,
    phone_primary: p.phonePrimary,
    phone_secondary: p.phoneSecondary,
    village: p.village,
    landmark: p.landmark,
    weeks_pregnant: p.weeksPregnant,
    due_date: p.dueDate ? p.dueDate.toISOString().slice(0, 10) : null,
    blood_type: p.bloodType,
    language: p.language,
    status_token: p.statusToken,
    risk_flags: p.riskFlags,
    emergency_contacts: p.emergencyContacts,
    patient_status: p.patientStatus,
    medication_name: p.medicationName,
    prev_pregnancies: p.prevPregnancies,
    prev_births: p.prevBirths,
    prev_csection: p.prevCsection,
    last_anc_date: p.lastAncDate ? p.lastAncDate.toISOString().slice(0, 10) : null,
    created_at: p.createdAt.toISOString(),
    updated_at: p.updatedAt.toISOString(),
  }
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

    try {
      const rows = await prisma.alert.findMany({
        where: { status: { in: ['active', 'volunteer_responding', 'at_facility'] } },
        orderBy: { triggeredAt: 'desc' },
        include: {
          patient: {
            select: {
              name: true,
              landmark: true,
              weeksPregnant: true,
              zoneId: true,
              healthWorkerId: true,
              registrationVerified: true,
            },
          },
        },
      })

      const filtered = rows.filter((row) => {
        const p = row.patient
        if (!p) {
          return false
        }
        const pZone = p.zoneId
        const pHw = p.healthWorkerId
        if (req.healthWorker?.access_level === 'admin') {
          return zoneId !== null && zoneId !== undefined && pZone === zoneId
        }
        return pHw === uid
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

      const out = filtered.map((r) => {
        const p = r.patient
        const rid = r.respondingVolunteerId
        return {
          id: r.id,
          status: r.status,
          priority: r.priority,
          triggered_at: r.triggeredAt.toISOString(),
          patient: {
            name: p?.name ?? '',
            landmark: p?.landmark ?? null,
            weeks_pregnant: p?.weeksPregnant ?? null,
            registration_verified: p?.registrationVerified ?? true,
          },
          responding_volunteer_name: typeof rid === 'string' && volNames[rid] ? volNames[rid] : null,
        }
      })

      res.json(out)
    } catch (err) {
      logError('alerts list failed', { error: String(err) })
      res.status(500).json({ error: 'Failed to load alerts' })
    }
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

    const alert = await prisma.alert.findUnique({
      where: { id },
      include: {
        patient: true,
      },
    })

    if (!alert || !alert.patient) {
      res.status(404).json({ error: 'Alert not found' })
      return
    }

    const responses = await prisma.alertResponse.findMany({
      where: { alertId: id },
      include: {
        volunteer: { select: { id: true, name: true, phone: true } },
      },
    })

    const pRaw = patientToSnake(alert.patient)
    const pZone = typeof pRaw.zone_id === 'string' ? pRaw.zone_id : null
    const pHw = typeof pRaw.health_worker_id === 'string' ? pRaw.health_worker_id : null
    const allowedAdmin = req.healthWorker?.access_level === 'admin' && zoneId === pZone
    const allowedHw = pHw === uid
    if (!allowedAdmin && !allowedHw) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }

    const alertJson = {
      id: alert.id,
      patient_id: alert.patientId,
      status: alert.status,
      priority: alert.priority,
      triggered_at: alert.triggeredAt.toISOString(),
      resolved_at: alert.resolvedAt?.toISOString() ?? null,
      responding_volunteer_id: alert.respondingVolunteerId,
      volunteer_confirmed_at: alert.volunteerConfirmedAt?.toISOString() ?? null,
      nearest_hospital_id: alert.nearestHospitalId,
      wave_number: alert.waveNumber,
      incapacitation_suspected: alert.incapacitationSuspected,
      created_at: alert.createdAt.toISOString(),
      updated_at: alert.updatedAt.toISOString(),
      patients: pRaw,
      alert_responses: responses.map((r) => ({
        id: r.id,
        alert_id: r.alertId,
        volunteer_id: r.volunteerId,
        response: r.response,
        sent_at: r.sentAt.toISOString(),
        responded_at: r.respondedAt?.toISOString() ?? null,
        wave_number: r.waveNumber,
        volunteers: r.volunteer
          ? { id: r.volunteer.id, name: r.volunteer.name, phone: r.volunteer.phone }
          : null,
      })),
    }

    res.json(alertJson)
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
    const zoneId = req.healthWorker?.zone_id

    const alert = await prisma.alert.findUnique({
      where: { id },
      include: { patient: { select: { zoneId: true } } },
    })

    if (!alert || !alert.patient) {
      res.status(404).json({ error: 'Alert not found' })
      return
    }
    const pZone = alert.patient.zoneId
    const allowedAdmin = req.healthWorker?.access_level === 'admin' && zoneId === pZone
    if (!allowedAdmin) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }

    const now = new Date()
    try {
      await prisma.alert.update({
        where: { id },
        data: { status: 'resolved', resolvedAt: now },
      })
    } catch (upErr) {
      logError('alert resolve failed', { error: String(upErr) })
      res.status(500).json({ error: 'Could not resolve alert' })
      return
    }

    res.json({ success: true })
  }),
)
