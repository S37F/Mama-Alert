import { normalizePhone } from '@/lib/phone'
import { rpcGetPatientForSos, rpcGetPatientForSosById } from '@/services/db/rpc'
import type { PatientSosRow } from '@/types/patientSos'

function isPatientSosRow(value: unknown): value is PatientSosRow {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const o = value as Record<string, unknown>
  return (
    typeof o.id === 'string' &&
    typeof o.name === 'string' &&
    typeof o.phone_primary === 'string' &&
    typeof o.language === 'string' &&
    typeof o.lat === 'number' &&
    typeof o.lng === 'number' &&
    typeof o.health_worker_id === 'string' &&
    typeof o.status_token === 'string'
  )
}

export async function fetchPatientForSos(phone: string): Promise<PatientSosRow | null> {
  const normalized = normalizePhone(phone)
  const data = await rpcGetPatientForSos(normalized)
  if (!data || data.length === 0) {
    return null
  }
  const row = data[0]
  return isPatientSosRow(row) ? row : null
}

export async function fetchPatientForSosById(patientId: string): Promise<PatientSosRow | null> {
  const data = await rpcGetPatientForSosById(patientId)
  if (!data || data.length === 0) {
    return null
  }
  const row = data[0]
  return isPatientSosRow(row) ? row : null
}
