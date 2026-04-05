export interface Hospital {
  id: string
  name: string
  phone_emergency: string | null
  services?: string[]
  is_24hr?: boolean
  distance_m?: number
}
