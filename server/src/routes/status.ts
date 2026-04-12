import { Router } from 'express'
import { asyncHandler } from '@/lib/asyncHandler'
import { prisma } from '@/lib/prisma'

export const statusRouter = Router()

statusRouter.get(
  '/:token',
  asyncHandler(async (req, res) => {
    const token = req.params.token
    if (!token) {
      res.status(400).json({ error: 'Missing token' })
      return
    }

    const patient = await prisma.patient.findUnique({
      where: { statusToken: token },
      select: { id: true, name: true },
    })

    if (!patient) {
      res.status(404).json({ error: 'Not found' })
      return
    }

    const latest = await prisma.alert.findFirst({
      where: { patientId: patient.id },
      orderBy: { triggeredAt: 'desc' },
      select: {
        status: true,
        triggeredAt: true,
        updatedAt: true,
        patientArrivedAt: true,
        respondingVolunteerId: true,
        nearestHospitalId: true,
      },
    })

    const firstName = patient.name.split(/\s+/)[0] ?? patient.name

    let volunteerName: string | null = null
    let hospitalName: string | null = null
    let alertStatus = 'none'
    let lastUpdated: string | null = null
    let patientArrivedAt: string | null = null

    if (latest) {
      alertStatus = latest.status
      lastUpdated = latest.updatedAt.toISOString() ?? latest.triggeredAt.toISOString()
      patientArrivedAt = latest.patientArrivedAt?.toISOString() ?? null
      if (latest.respondingVolunteerId) {
        const v = await prisma.volunteer.findUnique({
          where: { id: latest.respondingVolunteerId },
          select: { name: true },
        })
        volunteerName = v?.name ?? null
      }
      if (latest.nearestHospitalId) {
        const h = await prisma.hospital.findUnique({
          where: { id: latest.nearestHospitalId },
          select: { name: true },
        })
        hospitalName = h?.name ?? null
      }
    }

    res.json({
      patientFirstName: firstName,
      alertStatus,
      volunteerName,
      hospitalName,
      patientArrivedAt,
      lastUpdated,
    })
  }),
)
