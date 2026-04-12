import type { Patient as PatientModel } from '@prisma/client'
import { extractFamilyPhones } from '@/lib/emergencyContacts'
import { logAudit, logError, logWarn } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
import { rpcClaimAlertForVolunteer, rpcGetPatientForSos } from '@/services/db/rpc'
import { getNearbyHospital } from '@/services/geo'
import {
  buildClinicPreAlertSMS,
  buildFamilySMS,
  buildPatientConfirmationSMS,
  buildVolunteerDirectionsSMS,
} from '@/services/messageBuilder'
import { sendSMS, sendSmsMultipart } from '@/services/twilio'
import { notifyVolunteerFeedRefresh } from '@/services/volunteerSseHub'
import type { PatientSosRow } from '@/types/patientSos'
import type { Patient } from '@/types/patient'
import type { Volunteer } from '@/types/volunteer'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** Map Prisma patient row to the snake_case shape `mapPatientFromJoin` expects. */
export function patientModelToJoinRaw(p: PatientModel): Record<string, unknown> {
  return {
    id: p.id,
    name: p.name,
    phone_primary: p.phonePrimary,
    phone_secondary: p.phoneSecondary,
    village: p.village,
    landmark: p.landmark,
    weeks_pregnant: p.weeksPregnant,
    due_date: p.dueDate ? p.dueDate.toISOString().slice(0, 10) : null,
    blood_type: p.bloodType,
    language: p.language,
    status_token: p.statusToken,
    health_worker_id: p.healthWorkerId,
    zone_id: p.zoneId,
    age: p.age,
    risk_flags: p.riskFlags,
    emergency_contacts: p.emergencyContacts,
    last_anc_date: p.lastAncDate ? p.lastAncDate.toISOString().slice(0, 10) : null,
  }
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
  const responses = await prisma.alertResponse.findMany({
    where: { volunteerId, response: null },
    orderBy: { sentAt: 'desc' },
    take: 10,
    select: { id: true, alertId: true },
  })

  if (responses.length === 0) {
    return null
  }

  for (const row of responses) {
    const al = await prisma.alert.findUnique({
      where: { id: row.alertId },
      select: { status: true },
    })
    if (al?.status === 'active') {
      return { responseId: row.id, alertId: row.alertId }
    }
  }
  return null
}

export async function applyVolunteerDone(volunteerId: string): Promise<boolean> {
  const alert = await prisma.alert.findFirst({
    where: { respondingVolunteerId: volunteerId, status: 'volunteer_responding' },
    orderBy: { triggeredAt: 'desc' },
    select: { id: true },
  })

  if (!alert) {
    return false
  }

  const updated = await prisma.alert.updateMany({
    where: { id: alert.id, status: 'volunteer_responding' },
    data: { status: 'at_facility' },
  })

  return updated.count > 0
}

export async function applyVolunteerNo(responseId: string): Promise<void> {
  const before = await prisma.alertResponse.findUnique({
    where: { id: responseId },
    select: { volunteerId: true },
  })
  const volunteerId = before?.volunteerId ?? null

  try {
    await prisma.alertResponse.update({
      where: { id: responseId },
      data: { response: 'NO', respondedAt: new Date() },
    })
  } catch (upErr) {
    logError('volunteer-reply: NO update failed', { error: String(upErr) })
    return
  }
  if (volunteerId) {
    notifyVolunteerFeedRefresh(volunteerId)
  }
}

export async function applyVolunteerYes(vol: Volunteer, responseId: string, alertId: string): Promise<void> {
  const alertJoin = await prisma.alert.findUnique({
    where: { id: alertId },
    include: { patient: true },
  })

  if (!alertJoin?.patient) {
    logError('volunteer-reply: load alert failed', { alertId })
    return
  }

  const patientRaw = patientModelToJoinRaw(alertJoin.patient)
  const patient = mapPatientFromJoin(patientRaw)
  if (!patient) {
    return
  }

  let lat = 0
  let lng = 0
  try {
    const rpcRows = await rpcGetPatientForSos(patient.phone_primary)
    if (rpcRows && rpcRows.length > 0) {
      const pr = rpcRows[0] as PatientSosRow
      lat = pr.lat
      lng = pr.lng
    }
  } catch (rpcErr) {
    logWarn('volunteer-reply: get_patient_for_sos failed', { error: String(rpcErr) })
  }

  const hospital = lat && lng ? await getNearbyHospital(lat, lng, 100_000).catch(() => null) : null

  let claim: { ok: boolean; reason?: string }
  try {
    claim = await rpcClaimAlertForVolunteer(
      alertId,
      vol.id,
      responseId,
      hospital?.id ?? null,
    )
  } catch (claimErr) {
    logError('volunteer-reply: claim RPC failed', { error: String(claimErr) })
    return
  }

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

  const contacts = patientRaw.emergency_contacts
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
  zone_id?: string | null
  zoneId?: string | null
}): Volunteer {
  const zone_id = row.zone_id ?? row.zoneId ?? null
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    language: row.language,
    zone_id,
  }
}
