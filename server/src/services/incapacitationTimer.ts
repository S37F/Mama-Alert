/**
 * Incapacitation follow-up is scheduled via `delayed_jobs` (see delayedJobProcessor).
 */
import { Prisma } from '@prisma/client'
import { excludeUssdIncapacitation } from '@/config/incapacitationEnv'
import { extractFamilyPhones } from '@/lib/emergencyContacts'
import { logError, logWarn } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
import { patientSosRowToPatient } from '@/services/patientMapper'
import { fetchPatientForSos } from '@/services/patientQueries'
import {
  buildFamilyIncapacitationSMS,
  buildVolunteerAlertSMS,
} from '@/services/messageBuilder'
import { getNearbyVolunteers } from '@/services/geo'
import { sendSmsMultipart } from '@/services/twilio'
import { notifyVolunteerFeedRefresh } from '@/services/volunteerSseHub'
import type { Alert } from '@/types/alert'

function incapacitationDelayMs(): number {
  const raw = process.env.INCAPACITATION_DELAY_MS
  if (raw === undefined || raw === '') {
    return 60_000
  }
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) && n >= 0 ? n : 60_000
}

async function alreadyContactedVolunteerIds(alertId: string): Promise<Set<string>> {
  try {
    const rows = await prisma.alertResponse.findMany({
      where: { alertId },
      select: { volunteerId: true },
    })
    return new Set(rows.map((r) => r.volunteerId))
  } catch (err) {
    logError('incapacitation: list alert_responses failed', { alertId, error: String(err) })
    return new Set()
  }
}

async function enqueueIncapacitationJob(alertId: string, patientId: string): Promise<void> {
  const delay = incapacitationDelayMs()
  const runAfter = new Date(Date.now() + delay)
  const payload: Prisma.InputJsonValue = { alertId, patientId }
  try {
    await prisma.delayedJob.create({
      data: {
        dedupeKey: `incap:${alertId}`,
        jobType: 'incapacitation',
        payload,
        runAfter,
      },
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return
    }
    logError('incapacitation: delayed_jobs insert failed', { alertId, error: String(e) })
  }
}

export function scheduleIncapacitationFollowUp(
  alertId: string,
  patientId: string,
  triggerMethod: 'pwa' | 'sms' | 'ussd',
): void {
  if (triggerMethod === 'ussd' && excludeUssdIncapacitation()) {
    return
  }
  void enqueueIncapacitationJob(alertId, patientId)
}

export async function runIncapacitationStep(alertId: string, patientId: string): Promise<void> {
  const alertData = await prisma.alert.findUnique({
    where: { id: alertId },
    select: {
      id: true,
      patientId: true,
      status: true,
      priority: true,
      triggeredAt: true,
      resolvedAt: true,
      respondingVolunteerId: true,
      volunteerConfirmedAt: true,
      nearestHospitalId: true,
      waveNumber: true,
      incapacitationSuspected: true,
    },
  })

  if (!alertData) {
    logError('incapacitation: load alert failed', { alertId })
    return
  }
  if (alertData.status !== 'active') {
    return
  }
  if (alertData.respondingVolunteerId != null || alertData.volunteerConfirmedAt != null) {
    return
  }

  const patMin = await prisma.patient.findUnique({
    where: { id: patientId },
    select: { phonePrimary: true },
  })

  if (!patMin?.phonePrimary) {
    logError('incapacitation: load patient phone failed', { patientId })
    return
  }

  const geoRow = await fetchPatientForSos(patMin.phonePrimary)
  if (!geoRow) {
    logWarn('incapacitation: patient geo missing', { patientId })
    return
  }

  const patientForFamily = patientSosRowToPatient(geoRow)

  const alertRow: Alert = {
    id: alertData.id,
    patient_id: alertData.patientId,
    status: alertData.status as Alert['status'],
    priority: alertData.priority as Alert['priority'],
    triggered_at: alertData.triggeredAt.toISOString(),
    resolved_at: alertData.resolvedAt?.toISOString() ?? null,
    responding_volunteer_id: null,
    volunteer_confirmed_at: null,
    nearest_hospital_id: alertData.nearestHospitalId,
    wave_number: alertData.waveNumber,
    incapacitation_suspected: Boolean(alertData.incapacitationSuspected),
  }

  try {
    await prisma.alert.updateMany({
      where: { id: alertId, status: 'active' },
      data: { priority: 2, incapacitationSuspected: true },
    })
  } catch (upErr) {
    logError('incapacitation: update alert failed', { alertId, error: String(upErr) })
    return
  }

  const phones = extractFamilyPhones(geoRow.emergency_contacts)
  const famMsg = buildFamilyIncapacitationSMS(
    patientForFamily,
    patientForFamily.status_token,
    patientForFamily.language,
  )
  for (const to of phones) {
    try {
      await sendSmsMultipart(to, famMsg)
    } catch (err) {
      logError('incapacitation: family SMS failed', { err: String(err) })
    }
  }

  const contacted = await alreadyContactedVolunteerIds(alertId)
  let volunteers: Awaited<ReturnType<typeof getNearbyVolunteers>> = []
  try {
    volunteers = await getNearbyVolunteers(geoRow.lat, geoRow.lng, 10_000)
  } catch (err) {
    logError('incapacitation: getNearbyVolunteers failed', { alertId, err: String(err) })
    return
  }

  const fresh = volunteers.filter((v) => !contacted.has(v.id))
  for (const v of fresh) {
    try {
      await prisma.alertResponse.create({
        data: {
          alertId,
          volunteerId: v.id,
          waveNumber: 2,
          response: null,
        },
      })
      notifyVolunteerFeedRefresh(v.id)
      const smsBody = buildVolunteerAlertSMS(patientForFamily, v, alertRow, v.language)
      await sendSmsMultipart(v.phone, smsBody)
    } catch (err) {
      logError('incapacitation: volunteer SMS failed', { alertId, volunteerId: v.id, err: String(err) })
    }
  }
}
