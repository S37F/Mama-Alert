import { extractFamilyPhones } from '@/lib/emergencyContacts'
import { logAudit, logError, logWarn } from '@/lib/logger'
import { getNearbyHospital } from '@/services/geo'
import {
  buildClinicPreAlertSMS,
  buildFamilySMS,
  buildPatientConfirmationSMS,
  buildVolunteerDirectionsSMS,
} from '@/services/messageBuilder'
import { supabaseAdmin } from '@/services/supabase'
import { sendSMS, sendSmsMultipart } from '@/services/twilio'
import { notifyVolunteerFeedRefresh } from '@/services/volunteerSseHub'
import type { PatientSosRow } from '@/types/patientSos'
import type { Patient } from '@/types/patient'
import type { Volunteer } from '@/types/volunteer'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function mapPatientFromJoin(raw: unknown): Patient | null {
  if (!isRecord(raw)) {
    return null
  }
  const id = raw.id
  const name = raw.name
  const phone_primary = raw.phone_primary
  const language = raw.language
  const status_token = raw.status_token
  const health_worker_id = raw.health_worker_id
  if (
    typeof id !== 'string' ||
    typeof name !== 'string' ||
    typeof phone_primary !== 'string' ||
    typeof language !== 'string' ||
    typeof status_token !== 'string' ||
    typeof health_worker_id !== 'string'
  ) {
    return null
  }
  return {
    id,
    name,
    age: typeof raw.age === 'number' ? raw.age : null,
    phone_primary,
    phone_secondary: typeof raw.phone_secondary === 'string' ? raw.phone_secondary : null,
    village: typeof raw.village === 'string' ? raw.village : null,
    landmark: typeof raw.landmark === 'string' ? raw.landmark : null,
    weeks_pregnant: typeof raw.weeks_pregnant === 'number' ? raw.weeks_pregnant : null,
    due_date: typeof raw.due_date === 'string' ? raw.due_date : null,
    blood_type: typeof raw.blood_type === 'string' ? raw.blood_type : null,
    language,
    status_token,
    health_worker_id,
    zone_id: typeof raw.zone_id === 'string' ? raw.zone_id : null,
    status: 'active',
    lat: null,
    lng: null,
    risk_flags: Array.isArray(raw.risk_flags)
      ? (raw.risk_flags as unknown[]).filter((s): s is string => typeof s === 'string')
      : null,
  }
}

export async function findActivePendingResponseForVolunteer(
  volunteerId: string,
): Promise<{ responseId: string; alertId: string } | null> {
  const { data: responses, error: rErr } = await supabaseAdmin
    .from('alert_responses')
    .select('id, alert_id, sent_at')
    .eq('volunteer_id', volunteerId)
    .is('response', null)
    .order('sent_at', { ascending: false })
    .limit(10)

  if (rErr || !responses || responses.length === 0) {
    return null
  }

  for (const row of responses) {
    const { data: al } = await supabaseAdmin.from('alerts').select('status').eq('id', row.alert_id).maybeSingle()
    if (al?.status === 'active') {
      return { responseId: row.id, alertId: row.alert_id }
    }
  }
  return null
}

export async function applyVolunteerDone(volunteerId: string): Promise<boolean> {
  const { data: alert, error } = await supabaseAdmin
    .from('alerts')
    .select('id, status')
    .eq('responding_volunteer_id', volunteerId)
    .eq('status', 'volunteer_responding')
    .order('triggered_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !alert) {
    return false
  }

  const { data: updated, error: upErr } = await supabaseAdmin
    .from('alerts')
    .update({ status: 'at_facility' })
    .eq('id', alert.id)
    .eq('status', 'volunteer_responding')
    .select('id')
    .maybeSingle()

  return !upErr && !!updated
}

export async function applyVolunteerNo(responseId: string): Promise<void> {
  const { data: before, error: loadErr } = await supabaseAdmin
    .from('alert_responses')
    .select('volunteer_id, volunteers ( phone )')
    .eq('id', responseId)
    .maybeSingle()
  if (loadErr) {
    logError('volunteer-reply: NO prefetch failed', { error: String(loadErr) })
  }
  let volunteerId: string | null =
    before && typeof before.volunteer_id === 'string' ? before.volunteer_id : null

  const nowIso = new Date().toISOString()
  const { error: upErr } = await supabaseAdmin
    .from('alert_responses')
    .update({ response: 'NO', responded_at: nowIso })
    .eq('id', responseId)
  if (upErr) {
    logError('volunteer-reply: NO update failed', { error: String(upErr) })
    return
  }
  if (volunteerId) {
    notifyVolunteerFeedRefresh(volunteerId)
  }
}

export async function applyVolunteerYes(vol: Volunteer, responseId: string, alertId: string): Promise<void> {
  const { data: alertJoin, error: aErr } = await supabaseAdmin
    .from('alerts')
    .select('*, patients(*)')
    .eq('id', alertId)
    .single()

  if (aErr || !alertJoin) {
    logError('volunteer-reply: load alert failed', { error: String(aErr) })
    return
  }

  const patientRaw = alertJoin.patients
  const patient = mapPatientFromJoin(patientRaw)
  if (!patient) {
    return
  }

  let lat = 0
  let lng = 0
  const { data: rpcRows, error: rpcErr } = await supabaseAdmin.rpc('get_patient_for_sos', {
    p_phone: patient.phone_primary,
  })
  if (!rpcErr && rpcRows && Array.isArray(rpcRows) && rpcRows.length > 0) {
    const pr = rpcRows[0] as PatientSosRow
    lat = pr.lat
    lng = pr.lng
  }

  const hospital = lat && lng ? await getNearbyHospital(lat, lng, 100_000).catch(() => null) : null

  const { data: claimRaw, error: claimErr } = await supabaseAdmin.rpc('claim_alert_for_volunteer', {
    p_alert_id: alertId,
    p_volunteer_id: vol.id,
    p_response_id: responseId,
    p_nearest_hospital_id: hospital?.id ?? null,
  })

  if (claimErr) {
    logError('volunteer-reply: claim RPC failed', { error: String(claimErr) })
    return
  }

  const claim = claimRaw as { ok?: boolean; reason?: string }
  if (!claim?.ok) {
    logWarn('volunteer-reply: claim rejected', { reason: claim?.reason, alertId })
    return
  }

  logAudit('volunteer_claimed_alert', { alertId, volunteerId: vol.id })

  try {
    if (hospital) {
      const dir = buildVolunteerDirectionsSMS(patient, vol, hospital, vol.language)
      await sendSmsMultipart(vol.phone, dir)
    }
  } catch (err) {
    logError('volunteer-reply: directions SMS failed', { err: String(err) })
  }

  try {
    const conf = buildPatientConfirmationSMS(vol.name, patient.language)
    await sendSMS(patient.phone_primary, conf)
  } catch (err) {
    logError('volunteer-reply: patient confirmation SMS failed', { err: String(err) })
  }

  const contacts = isRecord(patientRaw) ? patientRaw.emergency_contacts : undefined
  const phones = extractFamilyPhones(contacts)
  const famMsg = buildFamilySMS(patient, vol.name, patient.status_token, patient.language)
  for (const ph of phones) {
    try {
      await sendSmsMultipart(ph, famMsg)
    } catch (err) {
      logError('volunteer-reply: family SMS failed', { err: String(err) })
    }
  }

  if (hospital?.phone_emergency) {
    try {
      const eta = 25
      const clinic = buildClinicPreAlertSMS(patient, vol, eta, patient.language)
      await sendSmsMultipart(hospital.phone_emergency, clinic)
    } catch (err) {
      logError('volunteer-reply: clinic pre-alert SMS failed', { err: String(err) })
    }
  }

  notifyVolunteerFeedRefresh(vol.id)
}

export function toVolunteerRow(row: {
  id: string
  name: string
  phone: string
  language: string
  zone_id: string | null
}): Volunteer {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    language: row.language,
    zone_id: row.zone_id,
  }
}
