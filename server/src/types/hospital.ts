export interface Hospital {
  id: string
  name: string
  phone_emergency: string | null
  services?: string[]
  is_24hr?: boolean
  distance_m?: number
  /** km cap for pre-alerts; undefined/null = no cap within search radius */
  pre_alert_radius_km?: number | null
}
