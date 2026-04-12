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
}

export async function triggerSosFromPatientRow(
  row: PatientSosRow,
  triggerMethod: TriggerSosInput['triggerMethod'],
  incapacitationSuspected?: boolean,
): Promise<TriggerSosResult> {
  const patient = patientSosRowToPatient(row)

  const incapacitation =
    Boolean(incapacitationSuspected) || triggerMethod === 'ussd'

  let parsed: { ok: boolean; reason?: string; alert_id?: string }
  try {
    parsed = await rpcInsertSosAlertIfAllowed(row.id, incapacitation, 600)
  } catch (rpcErr) {
    logError('sos: insert_sos_alert_if_allowed failed', { patientId: row.id, error: String(rpcErr) })
    throw rpcErr
  }
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

  const inserted = await prisma.alert.findUnique({
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

  if (!inserted) {
    logError('sos: fetch alert after insert failed', { patientId: row.id })
    throw new Error('Alert fetch failed')
  }

  const alertRow: Alert = {
    id: inserted.id,
    patient_id: inserted.patientId,
    status: inserted.status as Alert['status'],
    priority: inserted.priority as Alert['priority'],
    triggered_at: inserted.triggeredAt.toISOString(),
    resolved_at: inserted.resolvedAt?.toISOString() ?? null,
    responding_volunteer_id: inserted.respondingVolunteerId,
    volunteer_confirmed_at: inserted.volunteerConfirmedAt?.toISOString() ?? null,
    nearest_hospital_id: inserted.nearestHospitalId,
    wave_number: inserted.waveNumber,
    incapacitation_suspected: Boolean(inserted.incapacitationSuspected),
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
