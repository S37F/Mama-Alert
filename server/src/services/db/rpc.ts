import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import type { PatientSosRow } from '@/types/patientSos'

export async function rpcGetPatientForSos(phone: string): Promise<PatientSosRow[]> {
  return prisma.$queryRaw<PatientSosRow[]>`
    SELECT * FROM public.get_patient_for_sos(${phone}::text)
  `
}

export async function rpcGetPatientForSosById(patientId: string): Promise<PatientSosRow[]> {
  return prisma.$queryRaw<PatientSosRow[]>`
    SELECT * FROM public.get_patient_for_sos_by_id(${patientId}::uuid)
  `
}

export type NearbyVolunteerRpcRow = {
  id: string
  name: string
  phone: string
  skills: string[]
  vehicle: string
  distance_m: number
  language: string
}

export async function rpcGetNearbyVolunteers(
  lat: number,
  lng: number,
  radiusMeters: number,
): Promise<NearbyVolunteerRpcRow[]> {
  return prisma.$queryRaw<NearbyVolunteerRpcRow[]>`
    SELECT * FROM public.get_nearby_volunteers(${lat}::double precision, ${lng}::double precision, ${radiusMeters}::double precision)
  `
}

export type NearbyHospitalRpcRow = {
  id: string
  name: string
  phone_emergency: string | null
  services: string[]
  is_24hr: boolean
  distance_m: number
  pre_alert_radius_km: number | null
}

export async function rpcGetNearbyHospitals(
  lat: number,
  lng: number,
  radiusMeters: number,
): Promise<NearbyHospitalRpcRow[]> {
  return prisma.$queryRaw<NearbyHospitalRpcRow[]>`
    SELECT * FROM public.get_nearby_hospitals(${lat}::double precision, ${lng}::double precision, ${radiusMeters}::double precision)
  `
}

export async function rpcDistanceVolunteerToPatient(
  volunteerId: string,
  patientId: string,
): Promise<number | null> {
  const rows = await prisma.$queryRaw<{ d: number | null }[]>`
    SELECT public.distance_volunteer_to_patient(${volunteerId}::uuid, ${patientId}::uuid) AS d
  `
  const v = rows[0]?.d
  return typeof v === 'number' ? v : null
}

export type AdminPointRow = { id: string; name: string; lat: number; lng: number }

export async function rpcAdminPatientsInZone(zoneId: string): Promise<AdminPointRow[]> {
  return prisma.$queryRaw<AdminPointRow[]>`
    SELECT * FROM public.admin_patients_in_zone(${zoneId}::uuid)
  `
}

export async function rpcAdminVolunteersInZone(zoneId: string): Promise<AdminPointRow[]> {
  return prisma.$queryRaw<AdminPointRow[]>`
    SELECT * FROM public.admin_volunteers_in_zone(${zoneId}::uuid)
  `
}

export type AdminHospitalRow = AdminPointRow & { receive_alerts: boolean }

export async function rpcAdminHospitalsInZone(zoneId: string): Promise<AdminHospitalRow[]> {
  return prisma.$queryRaw<AdminHospitalRow[]>`
    SELECT * FROM public.admin_hospitals_in_zone(${zoneId}::uuid)
  `
}

export type AdminActiveAlertRow = { alert_id: string; lat: number; lng: number }

export async function rpcAdminActiveAlertPoints(zoneId: string): Promise<AdminActiveAlertRow[]> {
  return prisma.$queryRaw<AdminActiveAlertRow[]>`
    SELECT * FROM public.admin_active_alert_points(${zoneId}::uuid)
  `
}

function parseJsonbClaim(raw: Prisma.JsonValue | null | undefined): { ok: boolean; reason?: string } {
  if (raw === null || raw === undefined) {
    return { ok: false, reason: 'invalid_rpc' }
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>
    const out: { ok: boolean; reason?: string } = { ok: o.ok === true }
    if (typeof o.reason === 'string') {
      out.reason = o.reason
    }
    return out
  }
  return { ok: false, reason: 'invalid_rpc' }
}

export async function rpcInsertSosAlertIfAllowed(
  patientId: string,
  incapacitationSuspected: boolean,
  cooldownSeconds: number,
  triggerMethod: 'pwa' | 'sms' | 'ussd',
): Promise<{ ok: boolean; reason?: string; alert_id?: string }> {
  const rows = await prisma.$queryRaw<{ result: Prisma.JsonValue }[]>`
    SELECT public.insert_sos_alert_if_allowed(
      ${patientId}::uuid,
      ${incapacitationSuspected}::boolean,
      ${cooldownSeconds}::int,
      ${triggerMethod}::text
    ) AS result
  `
  const raw = rows[0]?.result
  if (raw === null || raw === undefined || typeof raw !== 'object' || Array.isArray(raw)) {
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

export async function rpcClaimAlertForVolunteer(
  alertId: string,
  volunteerId: string,
  responseId: string,
  nearestHospitalId: string | null,
): Promise<{ ok: boolean; reason?: string }> {
  const rows = await prisma.$queryRaw<{ result: Prisma.JsonValue }[]>`
    SELECT public.claim_alert_for_volunteer(
      ${alertId}::uuid,
      ${volunteerId}::uuid,
      ${responseId}::uuid,
      ${nearestHospitalId}::uuid
    ) AS result
  `
  return parseJsonbClaim(rows[0]?.result)
}
