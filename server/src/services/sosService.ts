import { logError, logWarn } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
import { rpcInsertSosAlertIfAllowed } from '@/services/db/rpc'
import { patientSosRowToPatient } from '@/services/patientMapper'
import { fetchPatientForSos } from '@/services/patientQueries'
import { getNearbyVolunteers } from '@/services/geo'
import { scheduleEscalation } from '@/services/escalation'
import { scheduleIncapacitationFollowUp } from '@/services/incapacitationTimer'
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
  duplicate?: boolean
}

export async function triggerSosFromPatientRow(
  row: PatientSosRow,
  triggerMethod: TriggerSosInput['triggerMethod'],
  incapacitationSuspected?: boolean,
): Promise<TriggerSosResult> {
  const patient = patientSosRowToPatient(row)
  if (!row.registration_verified) {
    logWarn('sos: unverified patient allowed to trigger SOS', { patientId: row.id, triggerMethod })
  }

  const incapacitation =
    Boolean(incapacitationSuspected) || triggerMethod === 'ussd'

  let parsed: { ok: boolean; reason?: string; alert_id?: string }
  try {
    parsed = await rpcInsertSosAlertIfAllowed(row.id, incapacitation, 600, triggerMethod)
  } catch (rpcErr) {
    logError('sos: insert_sos_alert_if_allowed failed', { patientId: row.id, error: String(rpcErr) })
    throw rpcErr
  }

  if (!parsed.ok && parsed.reason === 'duplicate' && typeof parsed.alert_id === 'string') {
    return {
      success: true,
      alertId: parsed.alert_id,
      volunteersNotified: 0,
      duplicate: true,
    }
  }

  if (!parsed.ok) {
    const err = new Error('Alert insert failed')
    ;(err as Error & { statusCode?: number }).statusCode = 500
    throw err
  }

  const alertId = parsed.alert_id
  if (!alertId) {
    throw new Error('Alert insert returned no id')
  }

  const alertRow: Alert = {
    id: alertId,
    patient_id: row.id,
    status: 'active',
    priority: 1,
    triggered_at: new Date().toISOString(),
    resolved_at: null,
    responding_volunteer_id: null,
    volunteer_confirmed_at: null,
    nearest_hospital_id: null,
    wave_number: 1,
    incapacitation_suspected: incapacitation,
  }

  let volunteers = await getNearbyVolunteers(row.lat, row.lng, 5000)
  if (volunteers.length === 0) {
    logWarn('sos: no volunteers within 5km; expanding to 10km', { patientId: row.id })
    volunteers = await getNearbyVolunteers(row.lat, row.lng, 10_000)
  }

  let notified = 0
  for (const v of volunteers) {
    try {
      await prisma.alertResponse.create({
        data: {
          alertId: alertRow.id,
          volunteerId: v.id,
          waveNumber: 1,
          response: null,
        },
      })
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
