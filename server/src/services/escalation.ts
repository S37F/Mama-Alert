/**
 * Escalation steps are scheduled via `delayed_jobs` (see delayedJobProcessor).
 */
import { Prisma } from '@prisma/client'
import { isTwilioMock } from '@/config/env'
import { logError, logWarn } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
import { patientSosRowToPatient } from '@/services/patientMapper'
import { fetchPatientForSos } from '@/services/patientQueries'
import {
  buildCoordinatorEscalationSMS,
  buildCoordinatorWave3ActionSMS,
  buildVolunteerAlertSMS,
} from '@/services/messageBuilder'
import { getNearbyVolunteers } from '@/services/geo'
import { sendSMS, sendSmsMultipart, sendVoiceConfirmation } from '@/services/twilio'
import { notifyVolunteerFeedRefresh } from '@/services/volunteerSseHub'
import type { Alert } from '@/types/alert'
import type { Patient } from '@/types/patient'
import type { Volunteer } from '@/types/volunteer'

type EscalationRadiiConfig = {
  delayMs: number
  r1: number
  r2: number
  r3: number
}

function defaultEscalationDelayMs(): number {
  const raw = process.env.ESCALATION_DELAY_MS
  if (raw === undefined || raw === '') {
    return 5 * 60 * 1000
  }
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) && n > 0 ? n : 5 * 60 * 1000
}

function coordinatorVoiceOnEscalation(): boolean {
  return process.env.COORDINATOR_VOICE_ON_ESCALATION === 'true'
}

function coordinatorPhone(): string | undefined {
  const p = process.env.COORDINATOR_PHONE
  return p && p.length > 0 ? p : undefined
}

export async function loadEscalationConfig(patientId: string): Promise<EscalationRadiiConfig> {
  const defaults: EscalationRadiiConfig = {
    delayMs: defaultEscalationDelayMs(),
    r1: 10_000,
    r2: 20_000,
    r3: 50_000,
  }
  const pat = await prisma.patient.findUnique({
    where: { id: patientId },
    select: { zoneId: true },
  })
  if (!pat?.zoneId) {
    return defaults
  }
  const z = await prisma.zone.findUnique({
    where: { id: pat.zoneId },
    select: {
      escalationR1M: true,
      escalationR2M: true,
      escalationR3M: true,
      escalationDelayMs: true,
    },
  })
  if (!z) {
    return defaults
  }
  const clampR = (m: unknown): number | null =>
    typeof m === 'number' && Number.isFinite(m) && m >= 5_000 && m <= 50_000 ? m : null
  const delayMs =
    typeof z.escalationDelayMs === 'number' && z.escalationDelayMs >= 30_000
      ? z.escalationDelayMs
      : defaults.delayMs
  return {
    delayMs,
    r1: clampR(z.escalationR1M) ?? defaults.r1,
    r2: clampR(z.escalationR2M) ?? defaults.r2,
    r3: clampR(z.escalationR3M) ?? defaults.r3,
  }
}

async function alreadyContactedVolunteerIds(alertId: string): Promise<Set<string>> {
  try {
    const rows = await prisma.alertResponse.findMany({
      where: { alertId },
      select: { volunteerId: true },
    })
    return new Set(rows.map((r) => r.volunteerId))
  } catch (err) {
    logError('escalation: list alert_responses failed', { alertId, error: String(err) })
    return new Set()
  }
}

async function notifyNewVolunteers(
  alertId: string,
  patient: Patient,
  alertRow: Alert,
  volunteers: Volunteer[],
  waveNumber: number,
): Promise<void> {
  for (const v of volunteers) {
    try {
      await prisma.alertResponse.create({
        data: {
          alertId,
          volunteerId: v.id,
          waveNumber,
          response: null,
        },
      })
      notifyVolunteerFeedRefresh(v.id)
      const body = buildVolunteerAlertSMS(patient, v, alertRow, v.language)
      await sendSmsMultipart(v.phone, body)
    } catch (err) {
      logError('escalation: insert alert_response failed', {
        alertId,
        volunteerId: v.id,
        error: String(err),
      })
    }
  }
}

async function runEscalationStep(params: {
  alertId: string
  patientPhone: string
  radiusM: number
  nextWaveNumber: number
  nextPriority: 1 | 2 | 3
  minutesSinceStart: number
}): Promise<void> {
  const { alertId, patientPhone, radiusM, nextWaveNumber, nextPriority, minutesSinceStart } = params
  const row = await fetchPatientForSos(patientPhone)
  if (!row) {
    logWarn('escalation: patient not found', { alertId })
    return
  }
  const patient = patientSosRowToPatient(row)

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
    logError('escalation: load alert failed', { alertId })
    return
  }
  if (alertData.status !== 'active' || alertData.respondingVolunteerId != null) {
    return
  }

  const alertRow: Alert = {
    id: alertData.id,
    patient_id: alertData.patientId,
    status: alertData.status as Alert['status'],
    priority: alertData.priority as Alert['priority'],
    triggered_at: alertData.triggeredAt.toISOString(),
    resolved_at: alertData.resolvedAt?.toISOString() ?? null,
    responding_volunteer_id: alertData.respondingVolunteerId,
    volunteer_confirmed_at: alertData.volunteerConfirmedAt?.toISOString() ?? null,
    nearest_hospital_id: alertData.nearestHospitalId,
    wave_number: alertData.waveNumber,
    incapacitation_suspected: Boolean(alertData.incapacitationSuspected),
  }

  const contacted = await alreadyContactedVolunteerIds(alertId)
  let volunteers: Volunteer[] = []
  try {
    volunteers = await getNearbyVolunteers(row.lat, row.lng, radiusM)
  } catch (err) {
    logError('escalation: getNearbyVolunteers failed', { alertId, err: String(err) })
    return
  }

  const fresh = volunteers.filter((v) => !contacted.has(v.id))

  try {
    await prisma.alert.update({
      where: { id: alertId },
      data: { priority: nextPriority, waveNumber: nextWaveNumber },
    })
  } catch (upErr) {
    logError('escalation: update alert priority failed', { alertId, error: String(upErr) })
  }

  await notifyNewVolunteers(alertId, patient, alertRow, fresh, nextWaveNumber)

  const coord = coordinatorPhone()
  if (coord) {
    try {
      const msg = buildCoordinatorEscalationSMS(patient, alertId, minutesSinceStart, patient.language)
      await sendSMS(coord, msg)
    } catch (err) {
      logError('escalation: coordinator SMS failed', { alertId, err: String(err) })
    }
  }
}

async function enqueueEscalationDelayedJob(alertId: string, patientId: string, wave: number): Promise<void> {
  let cfg: EscalationRadiiConfig
  try {
    cfg = await loadEscalationConfig(patientId)
  } catch (err) {
    logError('escalation: loadEscalationConfig failed', { patientId, err: String(err) })
    cfg = { delayMs: defaultEscalationDelayMs(), r1: 10_000, r2: 20_000, r3: 50_000 }
  }
  const runAfter = new Date(Date.now() + cfg.delayMs)
  const payload: Prisma.InputJsonValue = { alertId, patientId, wave }
  try {
    await prisma.delayedJob.create({
      data: {
        dedupeKey: `escalation:${alertId}:${wave}`,
        jobType: 'escalation',
        payload,
        runAfter,
      },
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return
    }
    logError('escalation: delayed_jobs insert failed', { alertId, error: String(e) })
  }
}

/** @param wave 0 -> run R1; 1 -> run R2; 2 -> run R3 + critical coordinator SMS. */
export function scheduleEscalation(alertId: string, patientId: string, wave: number): void {
  void enqueueEscalationDelayedJob(alertId, patientId, wave)
}

export async function runEscalationTimer(
  alertId: string,
  patientId: string,
  wave: number,
  cfg: EscalationRadiiConfig,
): Promise<void> {
  const alertRow = await prisma.alert.findUnique({
    where: { id: alertId },
    select: { id: true, status: true, patientId: true, triggeredAt: true, respondingVolunteerId: true },
  })
  if (!alertRow) {
    logError('escalation: timer fetch alert failed', { alertId })
    return
  }
  if (alertRow.status !== 'active' || alertRow.respondingVolunteerId != null) {
    return
  }
  const pat = await prisma.patient.findUnique({
    where: { id: alertRow.patientId },
    select: { phonePrimary: true },
  })
  if (!pat?.phonePrimary) {
    logError('escalation: missing patient phone', { alertId })
    return
  }
  const phone = pat.phonePrimary

  const triggered = alertRow.triggeredAt.getTime()
  const minutesSince = Math.max(0, Math.floor((Date.now() - triggered) / 60_000))

  if (wave === 0) {
    await runEscalationStep({
      alertId,
      patientPhone: phone,
      radiusM: cfg.r1,
      nextWaveNumber: 2,
      nextPriority: 2,
      minutesSinceStart: minutesSince,
    })
    scheduleEscalation(alertId, alertRow.patientId, 1)
  } else if (wave === 1) {
    await runEscalationStep({
      alertId,
      patientPhone: phone,
      radiusM: cfg.r2,
      nextWaveNumber: 3,
      nextPriority: 3,
      minutesSinceStart: minutesSince,
    })
    scheduleEscalation(alertId, alertRow.patientId, 2)
  } else if (wave === 2) {
    await runEscalationStep({
      alertId,
      patientPhone: phone,
      radiusM: cfg.r3,
      nextWaveNumber: 4,
      nextPriority: 3,
      minutesSinceStart: minutesSince,
    })
    const a = await prisma.alert.findUnique({
      where: { id: alertId },
      select: { status: true },
    })
    if (a?.status === 'active') {
      logWarn('CRITICAL: alert still active after full escalation — manual follow-up required', {
        alertId,
      })
      const coord = coordinatorPhone()
      if (coord) {
        const row = await fetchPatientForSos(phone)
        if (row) {
          const patient = patientSosRowToPatient(row)
          try {
            const msg = buildCoordinatorWave3ActionSMS(patient, alertId, phone, patient.language)
            await sendSmsMultipart(coord, msg)
            if (coordinatorVoiceOnEscalation() && !isTwilioMock()) {
              const voiceText = msg.slice(0, 400)
              await sendVoiceConfirmation(coord, voiceText)
            }
          } catch (err) {
            logError('escalation: final coordinator SMS failed', { alertId, err: String(err) })
          }
        }
      }
    }
  }
}
