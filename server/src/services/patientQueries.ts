import { normalizePhone } from '@/lib/phone'
import { supabaseAdmin } from '@/services/supabase'
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
  const { data, error } = await supabaseAdmin.rpc('get_patient_for_sos', {
    p_phone: normalized,
  })
  if (error) {
    throw error
  }
  if (!data || !Array.isArray(data) || data.length === 0) {
    return null
  }
  const row = data[0]
  return isPatientSosRow(row) ? row : null
}
