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

export async function getNearbyHospital(
  lat: number,
  lng: number,
  radiusMeters: number = 50_000,
): Promise<Hospital | null> {
  const data = await rpcGetNearbyHospitals(lat, lng, radiusMeters)
  if (!data || !Array.isArray(data) || data.length === 0) {
    return null
  }
  return mapHospitalRow(data[0] as NearbyHospitalRpcRow)
}
