export type AlertStatus =
  | 'active'
  | 'volunteer_responding'
  | 'at_facility'
  | 'resolved'
  | 'cancelled'

export type AlertPriority = 1 | 2 | 3

export type AlertResponseValue = 'YES' | 'NO' | null

export interface Alert {
  id: string
  patient_id: string
  status: AlertStatus
  priority: AlertPriority
  triggered_at: string
  resolved_at: string | null
  responding_volunteer_id: string | null
  volunteer_confirmed_at: string | null
}

export interface AlertResponse {
  id: string
  alert_id: string
  volunteer_id: string
  response: AlertResponseValue
  sent_at: string
  responded_at: string | null
  wave_number: number
}

/** Volunteer / inbox card shape (Phase 4 AlertCard). */
export interface AlertSummary {
  id: string
  status: AlertStatus
  triggeredAt: string
  patientFirstName: string
  landmark: string | null
  weeksPregnant: number | null
  distanceKm: number | null
  response: string | null
}
