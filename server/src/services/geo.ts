import {
  rpcGetNearbyHospitals,
  rpcGetNearbyVolunteers,
  type NearbyHospitalRpcRow,
  type NearbyVolunteerRpcRow,
} from '@/services/db/rpc'
import type { Hospital } from '@/types/hospital'
import type { Volunteer } from '@/types/volunteer'

function mapVolunteerRow(row: NearbyVolunteerRpcRow): Volunteer {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    language: row.language,
    zone_id: null,
    skills: Array.isArray(row.skills) ? row.skills : [],
    vehicle: typeof row.vehicle === 'string' ? row.vehicle : 'none',
    distance_m: row.distance_m,
  }
}

function mapHospitalRow(row: NearbyHospitalRpcRow): Hospital {
  return {
    id: row.id,
    name: row.name,
    phone_emergency: row.phone_emergency,
    services: Array.isArray(row.services) ? row.services : [],
    is_24hr: row.is_24hr,
    distance_m: row.distance_m,
    pre_alert_radius_km: row.pre_alert_radius_km,
  }
}

export async function getNearbyVolunteers(
  lat: number,
  lng: number,
  radiusMeters: number,
): Promise<Volunteer[]> {
  const data = await rpcGetNearbyVolunteers(lat, lng, radiusMeters)
  if (!data || !Array.isArray(data)) {
    return []
  }
  return data.map((row) => mapVolunteerRow(row))
}

/** Large default search so 25 km + "whole zone" (null cap) hospitals can match; each row may cap by pre_alert_radius_km. */
const HOSPITAL_SEARCH_RADIUS_M = 2_000_000

export async function getNearbyHospital(
  lat: number,
  lng: number,
  radiusMeters: number = HOSPITAL_SEARCH_RADIUS_M,
): Promise<Hospital | null> {
  const data = await rpcGetNearbyHospitals(lat, lng, radiusMeters)
  if (!data || !Array.isArray(data) || data.length === 0) {
    return null
  }
  for (const row of data) {
    const r = row as NearbyHospitalRpcRow
    const capKm = r.pre_alert_radius_km
    if (capKm === null || capKm === undefined) {
      return mapHospitalRow(r)
    }
    if (typeof r.distance_m === 'number' && r.distance_m <= capKm * 1000) {
      return mapHospitalRow(r)
    }
  }
  return null
}
