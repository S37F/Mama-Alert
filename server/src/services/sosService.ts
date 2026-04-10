import { logError, logWarn } from '@/lib/logger'
import { patientSosRowToPatient } from '@/services/patientMapper'
import { fetchPatientForSos } from '@/services/patientQueries'
import { getNearbyVolunteers } from '@/services/geo'
import { scheduleEscalation } from '@/services/escalation'
import { scheduleIncapacitationFollowUp } from '@/services/incapacitationTimer'
import { supabaseAdmin } from '@/services/supabase'
import { sendSmsMultipart } from '@/services/twilio'
import { buildVolunteerAlertSMS } from '@/services/messageBuilder'
import { notifyVolunteerFeedRefresh } from '@/services/volunteerSseHub'
import type { Alert } from '@/types/alert'
import type { PatientSosRow } from '@/types/patientSos'

export interface TriggerSosInput {
  phone: string
  triggerMethod: 'pwa' | 'sms' | 'ussd'
  incapacitationSuspected?: boolean
}

export interface TriggerSosResult {
  success: true
  alertId: string
  volunteersNotified: number
}

function parseInsertSosResult(raw: unknown): { ok: boolean; reason?: string; alert_id?: string } {
  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, reason: 'invalid_rpc' }
  }
  const o = raw as Record<string, unknown>
  const out: { ok: boolean; reason?: string; alert_id?: string } = { ok: o.ok === true }
  if (typeof o.reason === 'string') {
    out.reason = o.reason
  }
  if (typeof o.alert_id === 'string') {
    out.alert_id = o.alert_id
  }
  return out
}

export async function triggerSosFromPatientRow(
  row: PatientSosRow,
  triggerMethod: TriggerSosInput['triggerMethod'],
  incapacitationSuspected?: boolean,
): Promise<TriggerSosResult> {
  const patient = patientSosRowToPatient(row)

  const incapacitation =
    Boolean(incapacitationSuspected) || triggerMethod === 'ussd'

  const { data: rpcRaw, error: rpcErr } = await supabaseAdmin.rpc('insert_sos_alert_if_allowed', {
    p_patient_id: row.id,
    p_incapacitation_suspected: incapacitation,
    p_cooldown_seconds: 600,
  })

  if (rpcErr) {
    logError('sos: insert_sos_alert_if_allowed failed', { patientId: row.id, error: String(rpcErr) })
    throw rpcErr
  }

  const parsed = parseInsertSosResult(rpcRaw)
  if (!parsed.ok) {
    if (parsed.reason === 'duplicate') {
      const err = new Error('An alert was already triggered recently for this patient')
      ;(err as Error & { statusCode?: number }).statusCode = 409
      throw err
    }
    const err = new Error('Alert insert failed')
    ;(err as Error & { statusCode?: number }).statusCode = 500
    throw err
  }

  const alertId = parsed.alert_id
  if (!alertId) {
    throw new Error('Alert insert returned no id')
  }

  const { data: inserted, error: fetchErr } = await supabaseAdmin
    .from('alerts')
    .select(
      'id, patient_id, status, priority, triggered_at, resolved_at, responding_volunteer_id, volunteer_confirmed_at, nearest_hospital_id, wave_number, incapacitation_suspected',
    )
    .eq('id', alertId)
    .single()

  if (fetchErr || !inserted) {
    logError('sos: fetch alert after insert failed', { patientId: row.id, error: String(fetchErr) })
    throw fetchErr ?? new Error('Alert fetch failed')
  }

  const alertRow: Alert = {
    id: inserted.id,
    patient_id: inserted.patient_id,
    status: inserted.status as Alert['status'],
    priority: inserted.priority as Alert['priority'],
    triggered_at: inserted.triggered_at,
    resolved_at: inserted.resolved_at,
    responding_volunteer_id: inserted.responding_volunteer_id,
    volunteer_confirmed_at: inserted.volunteer_confirmed_at,
    nearest_hospital_id: inserted.nearest_hospital_id,
    wave_number: inserted.wave_number,
    incapacitation_suspected: Boolean(inserted.incapacitation_suspected),
  }

  let volunteers = await getNearbyVolunteers(row.lat, row.lng, 5000)
  if (volunteers.length === 0) {
    logWarn('sos: no volunteers within 5km; expanding to 10km', { patientId: row.id })
    volunteers = await getNearbyVolunteers(row.lat, row.lng, 10_000)
  }

  let notified = 0
  for (const v of volunteers) {
    try {
      const { error: rErr } = await supabaseAdmin.from('alert_responses').insert({
        alert_id: alertRow.id,
        volunteer_id: v.id,
        wave_number: 1,
        response: null,
      })
      if (rErr) {
        logError('sos: alert_response insert failed', {
          alertId: alertRow.id,
          volunteerId: v.id,
          error: String(rErr),
        })
        continue
      }
      notifyVolunteerFeedRefresh(v.id)
      const smsBody = buildVolunteerAlertSMS(patient, v, alertRow, v.language)
      await sendSmsMultipart(v.phone, smsBody)
      notified += 1
    } catch (err) {
      logError('sos: volunteer SMS failed', { alertId: alertRow.id, volunteerId: v.id, err: String(err) })
    }
  }

  scheduleEscalation(alertRow.id, row.id, 0)
  scheduleIncapacitationFollowUp(alertRow.id, row.id, triggerMethod)

  return {
    success: true,
    alertId: alertRow.id,
    volunteersNotified: notified,
  }
}

export async function triggerSos(input: TriggerSosInput): Promise<TriggerSosResult> {
  const row = await fetchPatientForSos(input.phone)
  if (!row) {
    const err = new Error('Patient not found')
    ;(err as Error & { statusCode?: number }).statusCode = 404
    throw err
  }
  return triggerSosFromPatientRow(row, input.triggerMethod, input.incapacitationSuspected)
}
