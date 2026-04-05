export type PatientStatus = 'active' | 'delivered' | 'transferred' | 'lost_followup'

export type PatientRiskFlag =
  | 'pre_eclampsia'
  | 'placenta_previa'
  | 'severe_anaemia'
  | 'gestational_diabetes'
  | 'multiple_pregnancy'
  | 'obstructed_labour_history'
  | 'hiv_positive'
  | 'on_medication'

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
  risk_flags: PatientRiskFlag[]
  lat: number | null
  lng: number | null
}
