export type AlertStatus =
  | 'active'
  | 'volunteer_responding'
  | 'at_facility'
  | 'resolved'
  | 'cancelled'

export type AlertPriority = 1 | 2 | 3

export interface Alert {
  id: string
  patient_id: string
  status: AlertStatus
  priority: AlertPriority
  triggered_at: string
  resolved_at: string | null
  responding_volunteer_id: string | null
  volunteer_confirmed_at: string | null
  nearest_hospital_id: string | null
  wave_number: number
  incapacitation_suspected: boolean
}
