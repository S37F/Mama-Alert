export type VolunteerSkill =
  | 'first_aid'
  | 'nurse'
  | 'community_health_worker'
  | 'driver'

export type VolunteerVehicle = 'none' | 'motorcycle' | 'car' | 'ambulance'

export interface Volunteer {
  id: string
  name: string
  phone: string
  skills: VolunteerSkill[]
  vehicle: VolunteerVehicle
  is_active: boolean
  max_radius_km: number
  language: string
  zone_id: string | null
  lat: number | null
  lng: number | null
}
