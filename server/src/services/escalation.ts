/**
 * Hackathon escalation: uses setTimeout. Production should use Bull/BullMQ or similar.
 */
import { isTwilioMock } from '@/config/env'
import { logError, logWarn } from '@/lib/logger'
import { patientSosRowToPatient } from '@/services/patientMapper'
import { fetchPatientForSos } from '@/services/patientQueries'
import {
  buildCoordinatorEscalationSMS,
  buildCoordinatorWave3ActionSMS,
  buildVolunteerAlertSMS,
} from '@/services/messageBuilder'
import { getNearbyVolunteers } from '@/services/geo'
import { supabaseAdmin } from '@/services/supabase'
import { sendSMS, sendSmsMultipart, sendVoiceConfirmation } from '@/services/twilio'
import { notifyVolunteerFeedRefresh } from '@/services/volunteerSseHub'
import type { Alert } from '@/types/alert'
import type { Patient } from '@/types/patient'
import type { Volunteer } from '@/types/volunteer'

type EscalationRadiiConfig = {
  delayMs: number
  r1: number
  r2: number
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
  }
  const { data: pat, error: pErr } = await supabaseAdmin
    .from('patients')
    .select('zone_id')
    .eq('id', patientId)
    .maybeSingle()
  if (pErr || !pat?.zone_id || typeof pat.zone_id !== 'string') {
    return defaults
  }
  const { data: z, error: zErr } = await supabaseAdmin
    .from('zones')
    .select('escalation_r1_m, escalation_r2_m, escalation_delay_ms')
    .eq('id', pat.zone_id)
    .maybeSingle()
  if (zErr || !z) {
    return defaults
  }
  const clampR = (m: unknown): number | null =>
    typeof m === 'number' && Number.isFinite(m) && m >= 5_000 && m <= 50_000 ? m : null
  const delayMs =
    typeof z.escalation_delay_ms === 'number' && z.escalation_delay_ms >= 30_000
      ? z.escalation_delay_ms
      : defaults.delayMs
  return {
    delayMs,
    r1: clampR(z.escalation_r1_m) ?? defaults.r1,
    r2: clampR(z.escalation_r2_m) ?? defaults.r2,
  }
}

async function alreadyContactedVolunteerIds(alertId: string): Promise<Set<string>> {
  const { data, error } = await supabaseAdmin
    .from('alert_responses')
    .select('volunteer_id')
    .eq('alert_id', alertId)
  if (error) {
    logError('escalation: list alert_responses failed', { alertId, error: String(error) })
    return new Set()
  }
  const ids = new Set<string>()
  if (data) {
    for (const row of data) {
      if (row && typeof row.volunteer_id === 'string') {
        ids.add(row.volunteer_id)
      }
    }
  }
  return ids
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
      const { error: insErr } = await supabaseAdmin.from('alert_responses').insert({
        alert_id: alertId,
        volunteer_id: v.id,
        wave_number: waveNumber,
        response: null,
      })
      if (insErr) {
        logError('escalation: insert alert_response failed', {
          alertId,
          volunteerId: v.id,
          error: String(insErr),
        })
        continue
      }
      notifyVolunteerFeedRefresh(v.id)
      const body = buildVolunteerAlertSMS(patient, v, alertRow, v.language)
      await sendSmsMultipart(v.phone, body)
    } catch (err) {
      logError('escalation: volunteer SMS failed', { alertId, volunteerId: v.id, err: String(err) })
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

  const { data: alertData, error: alertErr } = await supabaseAdmin
    .from('alerts')
    .select(
      'id, patient_id, status, priority, triggered_at, resolved_at, responding_volunteer_id, volunteer_confirmed_at, nearest_hospital_id, wave_number, incapacitation_suspected',
    )
    .eq('id', alertId)
    .single()
  if (alertErr || !alertData) {
    logError('escalation: load alert failed', { alertId, error: String(alertErr) })
    return
  }
  if (alertData.status !== 'active') {
    return
  }

  const alertRow: Alert = {
    id: alertData.id,
    patient_id: alertData.patient_id,
    status: alertData.status as Alert['status'],
    priority: alertData.priority as Alert['priority'],
    triggered_at: alertData.triggered_at,
    resolved_at: alertData.resolved_at,
    responding_volunteer_id: alertData.responding_volunteer_id,
    volunteer_confirmed_at: alertData.volunteer_confirmed_at,
    nearest_hospital_id: alertData.nearest_hospital_id,
    wave_number: alertData.wave_number,
    incapacitation_suspected: Boolean(alertData.incapacitation_suspected),
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

  const { error: upErr } = await supabaseAdmin
    .from('alerts')
    .update({ priority: nextPriority, wave_number: nextWaveNumber })
    .eq('id', alertId)
  if (upErr) {
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
    cfg = { delayMs: defaultEscalationDelayMs(), r1: 10_000, r2: 20_000 }
  }
  const runAfter = new Date(Date.now() + cfg.delayMs).toISOString()
  const { error } = await supabaseAdmin.from('delayed_jobs').insert({
    dedupe_key: `escalation:${alertId}:${wave}`,
    job_type: 'escalation',
    payload: { alertId, patientId, wave },
    run_after: runAfter,
  })
  if (error && !String(error.message).includes('duplicate')) {
    logError('escalation: delayed_jobs insert failed', { alertId, error: String(error) })
  }
}

/**
 * @param wave 0 → after delay run r1 wave; 1 → after delay run r2 wave; 2 → after delay coordinator action SMS (+ optional voice)
 */
export function scheduleEscalation(alertId: string, patientId: string, wave: number): void {
  void enqueueEscalationDelayedJob(alertId, patientId, wave)
}

export async function runEscalationTimer(
  alertId: string,
  patientId: string,
  wave: number,
  cfg: EscalationRadiiConfig,
): Promise<void> {
  const { data: alertRow, error } = await supabaseAdmin
    .from('alerts')
    .select('id, status, patient_id, triggered_at')
    .eq('id', alertId)
    .single()
  if (error || !alertRow) {
    logError('escalation: timer fetch alert failed', { alertId, error: String(error) })
    return
  }
  if (alertRow.status !== 'active') {
    return
  }
  const { data: pat, error: pErr } = await supabaseAdmin
    .from('patients')
    .select('phone_primary')
    .eq('id', alertRow.patient_id)
    .single()
  if (pErr || !pat?.phone_primary) {
    logError('escalation: missing patient phone', { alertId, error: String(pErr) })
    return
  }
  const phone = pat.phone_primary

  const triggered = new Date(alertRow.triggered_at).getTime()
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
    scheduleEscalation(alertId, alertRow.patient_id, 1)
  } else if (wave === 1) {
    await runEscalationStep({
      alertId,
      patientPhone: phone,
      radiusM: cfg.r2,
      nextWaveNumber: 3,
      nextPriority: 3,
      minutesSinceStart: minutesSince,
    })
    scheduleEscalation(alertId, alertRow.patient_id, 2)
  } else if (wave === 2) {
    const { data: a } = await supabaseAdmin.from('alerts').select('status').eq('id', alertId).single()
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
