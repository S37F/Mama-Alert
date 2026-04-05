import { supabaseAdmin } from '@/services/supabase'
import type { Hospital } from '@/types/hospital'
import type { Volunteer } from '@/types/volunteer'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function mapVolunteerRow(row: unknown): Volunteer | null {
  if (!isRecord(row)) {
    return null
  }
  const id = row.id
  const name = row.name
  const phone = row.phone
  const language = row.language
  if (typeof id !== 'string' || typeof name !== 'string' || typeof phone !== 'string') {
    return null
  }
  const lang = typeof language === 'string' ? language : 'en'
  const skills = Array.isArray(row.skills) ? row.skills.filter((s): s is string => typeof s === 'string') : []
  const vehicle = typeof row.vehicle === 'string' ? row.vehicle : 'none'
  const distance_m = typeof row.distance_m === 'number' ? row.distance_m : undefined
  return {
    id,
    name,
    phone,
    language: lang,
    zone_id: typeof row.zone_id === 'string' ? row.zone_id : null,
    skills,
    vehicle,
    distance_m,
  }
}

function mapHospitalRow(row: unknown): Hospital | null {
  if (!isRecord(row)) {
    return null
  }
  const id = row.id
  const name = row.name
  if (typeof id !== 'string' || typeof name !== 'string') {
    return null
  }
  const phone_emergency = typeof row.phone_emergency === 'string' ? row.phone_emergency : null
  const services = Array.isArray(row.services) ? row.services.filter((s): s is string => typeof s === 'string') : []
  const is_24hr = typeof row.is_24hr === 'boolean' ? row.is_24hr : false
  const distance_m = typeof row.distance_m === 'number' ? row.distance_m : undefined
  return { id, name, phone_emergency, services, is_24hr, distance_m }
}

export async function getNearbyVolunteers(
  lat: number,
  lng: number,
  radiusMeters: number,
): Promise<Volunteer[]> {
  const { data, error } = await supabaseAdmin.rpc('get_nearby_volunteers', {
    patient_lat: lat,
    patient_lng: lng,
    radius_meters: radiusMeters,
  })
  if (error) {
    throw error
  }
  if (!data || !Array.isArray(data)) {
    return []
  }
  const out: Volunteer[] = []
  for (const row of data) {
    const v = mapVolunteerRow(row)
    if (v) {
      out.push(v)
    }
  }
  return out
}

export async function getNearbyHospital(
  lat: number,
  lng: number,
  radiusMeters: number = 50_000,
): Promise<Hospital | null> {
  const { data, error } = await supabaseAdmin.rpc('get_nearby_hospitals', {
    patient_lat: lat,
    patient_lng: lng,
    radius_meters: radiusMeters,
  })
  if (error) {
    throw error
  }
  if (!data || !Array.isArray(data) || data.length === 0) {
    return null
  }
  return mapHospitalRow(data[0])
}
