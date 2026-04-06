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

export async function triggerSos(input: TriggerSosInput): Promise<TriggerSosResult> {
  const row = await fetchPatientForSos(input.phone)
  if (!row) {
    const err = new Error('Patient not found')
    ;(err as Error & { statusCode?: number }).statusCode = 404
    throw err
  }

  const patient = patientSosRowToPatient(row)
  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString()
  const { data: recent, error: recentErr } = await supabaseAdmin
    .from('alerts')
    .select('id')
    .eq('patient_id', row.id)
    .in('status', ['active', 'volunteer_responding', 'at_facility'])
    .gte('triggered_at', since)
    .limit(1)

  if (recentErr) {
    throw recentErr
  }
  if (recent && recent.length > 0) {
    const err = new Error('An alert was already triggered recently for this patient')
    ;(err as Error & { statusCode?: number }).statusCode = 409
    throw err
  }

  const incapacitation =
    Boolean(input.incapacitationSuspected) || input.triggerMethod === 'ussd'

  const { data: inserted, error: insErr } = await supabaseAdmin
    .from('alerts')
    .insert({
      patient_id: row.id,
      status: 'active',
      priority: 1,
      wave_number: 1,
      incapacitation_suspected: incapacitation,
    })
    .select(
      'id, patient_id, status, priority, triggered_at, resolved_at, responding_volunteer_id, volunteer_confirmed_at, nearest_hospital_id, wave_number, incapacitation_suspected',
    )
    .single()

  if (insErr || !inserted) {
    logError('sos: alert insert failed', { patientId: row.id, error: String(insErr) })
    throw insErr ?? new Error('Alert insert failed')
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
      notifyVolunteerFeedRefresh(v.phone)
      const smsBody = buildVolunteerAlertSMS(patient, v, alertRow, v.language)
      await sendSmsMultipart(v.phone, smsBody)
      notified += 1
    } catch (err) {
      logError('sos: volunteer SMS failed', { alertId: alertRow.id, volunteerId: v.id, err: String(err) })
    }
  }

  scheduleEscalation(alertRow.id, row.id, 0)
  scheduleIncapacitationFollowUp(alertRow.id, row.id, input.triggerMethod)

  return {
    success: true,
    alertId: alertRow.id,
    volunteersNotified: notified,
  }
}
