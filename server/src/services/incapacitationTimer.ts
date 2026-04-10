/**
 * Incapacitation follow-up is scheduled via `delayed_jobs` (see delayedJobProcessor).
 */
import { extractFamilyPhones } from '@/lib/emergencyContacts'
import { logError, logWarn } from '@/lib/logger'
import { patientSosRowToPatient } from '@/services/patientMapper'
import { fetchPatientForSos } from '@/services/patientQueries'
import {
  buildFamilyIncapacitationSMS,
  buildVolunteerAlertSMS,
} from '@/services/messageBuilder'
import { getNearbyVolunteers } from '@/services/geo'
import { supabaseAdmin } from '@/services/supabase'
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
  const { data, error } = await supabaseAdmin
    .from('alert_responses')
    .select('volunteer_id')
    .eq('alert_id', alertId)
  if (error) {
    logError('incapacitation: list alert_responses failed', { alertId, error: String(error) })
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

/**
 * After PWA/SMS SOS: if no volunteer confirms within INCAPACITATION_DELAY_MS, bump priority,
 * SMS family, and notify additional volunteers within 10 km (excluding already contacted).
 */
async function enqueueIncapacitationJob(alertId: string, patientId: string): Promise<void> {
  const delay = incapacitationDelayMs()
  const runAfter = new Date(Date.now() + delay).toISOString()
  const { error } = await supabaseAdmin.from('delayed_jobs').insert({
    dedupe_key: `incap:${alertId}`,
    job_type: 'incapacitation',
    payload: { alertId, patientId },
    run_after: runAfter,
  })
  if (error && !String(error.message).includes('duplicate')) {
    logError('incapacitation: delayed_jobs insert failed', { alertId, error: String(error) })
  }
}

export function scheduleIncapacitationFollowUp(
  alertId: string,
  patientId: string,
  triggerMethod: 'pwa' | 'sms' | 'ussd',
): void {
  if (triggerMethod === 'ussd') {
    return
  }
  void enqueueIncapacitationJob(alertId, patientId)
}

export async function runIncapacitationStep(alertId: string, patientId: string): Promise<void> {
  const { data: alertData, error: alertErr } = await supabaseAdmin
    .from('alerts')
    .select(
      'id, patient_id, status, priority, triggered_at, resolved_at, responding_volunteer_id, volunteer_confirmed_at, nearest_hospital_id, wave_number, incapacitation_suspected',
    )
    .eq('id', alertId)
    .single()

  if (alertErr || !alertData) {
    logError('incapacitation: load alert failed', { alertId, error: String(alertErr) })
    return
  }
  if (alertData.status !== 'active') {
    return
  }
  if (alertData.responding_volunteer_id != null || alertData.volunteer_confirmed_at != null) {
    return
  }

  const { data: patMin, error: patErr } = await supabaseAdmin
    .from('patients')
    .select('phone_primary')
    .eq('id', patientId)
    .maybeSingle()

  if (patErr || !patMin || typeof patMin.phone_primary !== 'string') {
    logError('incapacitation: load patient phone failed', { patientId, error: String(patErr) })
    return
  }

  const geoRow = await fetchPatientForSos(patMin.phone_primary)
  if (!geoRow) {
    logWarn('incapacitation: patient geo missing', { patientId })
    return
  }

  const patientForFamily = patientSosRowToPatient(geoRow)

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

  const { error: upErr } = await supabaseAdmin
    .from('alerts')
    .update({ priority: 2, incapacitation_suspected: true })
    .eq('id', alertId)
    .eq('status', 'active')
  if (upErr) {
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
      const { error: rErr } = await supabaseAdmin.from('alert_responses').insert({
        alert_id: alertId,
        volunteer_id: v.id,
        wave_number: 2,
        response: null,
      })
      if (rErr) {
        logError('incapacitation: alert_response insert failed', {
          alertId,
          volunteerId: v.id,
          error: String(rErr),
        })
        continue
      }
      notifyVolunteerFeedRefresh(v.id)
      const smsBody = buildVolunteerAlertSMS(patientForFamily, v, alertRow, v.language)
      await sendSmsMultipart(v.phone, smsBody)
    } catch (err) {
      logError('incapacitation: volunteer SMS failed', { alertId, volunteerId: v.id, err: String(err) })
    }
  }
}
