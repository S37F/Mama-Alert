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
        respondingVolunteerId: true,
        nearestHospitalId: true,
      },
    })

    const firstName = patient.name.split(/\s+/)[0] ?? patient.name

    let volunteerFirstName: string | null = null
    let hospitalName: string | null = null
    let alertStatus = 'none'

    if (latest) {
      alertStatus = latest.status
      if (latest.respondingVolunteerId) {
        const v = await prisma.volunteer.findUnique({
          where: { id: latest.respondingVolunteerId },
          select: { name: true },
        })
        const full = v?.name ?? null
        volunteerFirstName = full ? full.split(/\s+/)[0] ?? full : null
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
      volunteerFirstName,
      hospitalName,
    })
  }),
)
