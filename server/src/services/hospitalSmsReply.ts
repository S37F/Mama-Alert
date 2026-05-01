import { Prisma } from '@prisma/client'
import { extractFamilyPhones } from '@/lib/emergencyContacts'
import { logAudit, logError } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
import { recordAlertEvent } from '@/services/observability'
import { buildFamilyPatientArrivedSms } from '@/services/messageBuilder'
import { sendSmsMultipart } from '@/services/twilio'

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

/** Resolves the latest open alert for this hospital (SMS ARRIVED); notifies family + sets patient_arrived_at. */
export async function resolveLatestOpenAlertForHospital(hospitalId: string): Promise<boolean> {
  const openStatuses = ['active', 'volunteer_responding', 'at_facility']
  const now = new Date()
  const resolved = await prisma.$transaction(async (tx) => {
    const alert = await tx.alert.findFirst({
      where: {
        nearestHospitalId: hospitalId,
        status: { in: openStatuses },
      },
      orderBy: { triggeredAt: 'desc' },
      include: {
        patient: {
          select: {
            name: true,
            language: true,
            statusToken: true,
            emergencyContacts: true,
          },
        },
        nearestHospital: { select: { name: true } },
      },
    })

    if (!alert?.patient) {
      return null
    }

    const updated = await tx.alert.updateMany({
      where: { id: alert.id, status: { in: openStatuses } },
      data: { status: 'resolved', resolvedAt: now, patientArrivedAt: now },
    })
    if (updated.count === 0) {
      return null
    }

    await tx.hospitalAlertAck.create({
      data: {
        alertId: alert.id,
        hospitalId,
        ackType: 'arrived_sms',
      },
    })

    return {
      alertId: alert.id,
      patientName: alert.patient.name,
      patientLanguage: alert.patient.language ?? 'en',
      patientStatusToken: alert.patient.statusToken,
      patientEmergencyContacts: alert.patient.emergencyContacts,
      hospitalName: alert.nearestHospital?.name ?? 'clinic',
    }
  })

  if (!resolved) {
    return false
  }

  const firstName = resolved.patientName.split(/\s+/)[0] ?? resolved.patientName
  const phones = extractFamilyPhones(resolved.patientEmergencyContacts)
  const famMsg = buildFamilyPatientArrivedSms(
    firstName,
    resolved.hospitalName,
    resolved.patientStatusToken,
    resolved.patientLanguage,
  )
  for (const ph of phones) {
    try {
      await sendSmsMultipart(ph, famMsg, { alertId: resolved.alertId })
    } catch (err) {
      logError('hospital arrived: family SMS failed', { err: String(err) })
    }
  }

  logAudit('hospital_arrived_sms', { hospitalId, alertId: resolved.alertId })
  await recordAlertEvent({
    alertId: resolved.alertId,
    eventType: 'hospital_arrived_sms',
    actorType: 'hospital',
    actorId: hospitalId,
    channel: 'sms',
  })
  return true
}
