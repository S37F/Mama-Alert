import type { Json } from '@/types/json'

/** Row from public.get_patient_for_sos RPC */
export interface PatientSosRow {
  id: string
  name: string
  phone_primary: string
  language: string
  landmark: string | null
  blood_type: string | null
  lat: number
  lng: number
  zone_id: string | null
  health_worker_id: string
  emergency_contacts: Json
  status_token: string
  risk_flags?: string[] | null
  weeks_pregnant?: number | null
  preferred_hospital_id?: string | null
  registration_verified: boolean
}
