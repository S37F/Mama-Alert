export type PatientStatus = 'active' | 'delivered' | 'transferred' | 'lost_followup'

export interface Patient {
  id: string
  name: string
  age: number | null
  phone_primary: string
  phone_secondary: string | null
  village: string | null
  landmark: string | null
  weeks_pregnant: number | null
  due_date: string | null
  blood_type: string | null
  language: string
  status_token: string
  health_worker_id: string | null
  zone_id: string | null
  status: PatientStatus
  lat: number | null
  lng: number | null
  /** Present when loaded from DB for SMS copy. */
  risk_flags?: string[] | null
}
