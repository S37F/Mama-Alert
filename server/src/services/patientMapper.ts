import type { Patient } from '@/types/patient'
import type { PatientSosRow } from '@/types/patientSos'

export function patientSosRowToPatient(row: PatientSosRow): Patient {
  const risk =
    Array.isArray(row.risk_flags) ? row.risk_flags.filter((s): s is string => typeof s === 'string') : null
  return {
    id: row.id,
    name: row.name,
    age: null,
    phone_primary: row.phone_primary,
    phone_secondary: null,
    village: null,
    landmark: row.landmark,
    weeks_pregnant: typeof row.weeks_pregnant === 'number' ? row.weeks_pregnant : null,
    due_date: null,
    blood_type: row.blood_type,
    language: row.language,
    status_token: row.status_token,
    health_worker_id: row.health_worker_id,
    zone_id: row.zone_id,
    status: 'active',
    lat: row.lat,
    lng: row.lng,
    risk_flags: risk && risk.length > 0 ? risk : null,
  }
}
