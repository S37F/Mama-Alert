export interface Volunteer {
  id: string
  name: string
  phone: string
  language: string
  zone_id?: string | null
  skills?: string[]
  vehicle?: string
  distance_m?: number
}
