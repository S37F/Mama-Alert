import { Prisma } from '@prisma/client'
import { extractFamilyPhones } from '@/lib/emergencyContacts'
import { logAudit, logError } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
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
  const alert = await prisma.alert.findFirst({
    where: {
      nearestHospitalId: hospitalId,
      status: { in: ['active', 'volunteer_responding', 'at_facility'] },
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
    return false
  }

  const now = new Date()
  const patient = alert.patient
  const firstName = patient.name.split(/\s+/)[0] ?? patient.name
  const hospitalName = alert.nearestHospital?.name ?? 'clinic'
  const token = patient.statusToken
  const lang = patient.language ?? 'en'

  await prisma.$transaction([
    prisma.alert.update({
      where: { id: alert.id },
      data: { status: 'resolved', resolvedAt: now, patientArrivedAt: now },
    }),
    prisma.hospitalAlertAck.create({
      data: {
        alertId: alert.id,
        hospitalId,
        ackType: 'arrived_sms',
      },
    }),
  ])

  const phones = extractFamilyPhones(patient.emergencyContacts)
  const famMsg = buildFamilyPatientArrivedSms(firstName, hospitalName, token, lang)
  for (const ph of phones) {
    try {
      await sendSmsMultipart(ph, famMsg)
    } catch (err) {
      logError('hospital arrived: family SMS failed', { err: String(err) })
    }
  }

  logAudit('hospital_arrived_sms', { hospitalId, alertId: alert.id })
  return true
}
