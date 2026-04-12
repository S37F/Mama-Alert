import { Prisma } from '@prisma/client'
import { logAudit } from '@/lib/logger'
import { prisma } from '@/lib/prisma'

/** Match inbound Twilio `From` to a hospital `phone_main` or `phone_emergency` using DB normalization. */
export async function findHospitalIdBySmsFrom(fromRaw: string): Promise<string | null> {
  const rows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT id::text AS id FROM hospitals
    WHERE (
      phone_main IS NOT NULL
      AND public.normalize_phone_for_match(trim(phone_main)) = public.normalize_phone_for_match(trim(${fromRaw}))
    )
    OR (
      phone_emergency IS NOT NULL
      AND public.normalize_phone_for_match(trim(phone_emergency)) = public.normalize_phone_for_match(trim(${fromRaw}))
    )
    LIMIT 2
  `)
  if (rows.length === 0) {
    return null
  }
  return rows[0]?.id ?? null
}

/** Resolves the latest open alert for this hospital (same statuses as hospital inbox). */
export async function resolveLatestOpenAlertForHospital(hospitalId: string): Promise<boolean> {
  const alert = await prisma.alert.findFirst({
    where: {
      nearestHospitalId: hospitalId,
      status: { in: ['active', 'volunteer_responding', 'at_facility'] },
    },
    orderBy: { triggeredAt: 'desc' },
    select: { id: true },
  })
  if (!alert) {
    return false
  }
  const now = new Date()
  await prisma.$transaction([
    prisma.alert.update({
      where: { id: alert.id },
      data: { status: 'resolved', resolvedAt: now },
    }),
    prisma.hospitalAlertAck.create({
      data: {
        alertId: alert.id,
        hospitalId,
        ackType: 'arrived_sms',
      },
    }),
  ])
  logAudit('hospital_arrived_sms', { hospitalId, alertId: alert.id })
  return true
}
