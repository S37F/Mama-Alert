export type HospitalType = 'PHC' | 'CHC' | 'district' | 'tertiary'

export type HospitalService =
  | 'normal_delivery'
  | 'c_section'
  | 'blood_bank'
  | 'icu'
  | 'nicu'

export interface Hospital {
  id: string
  name: string
  type: HospitalType
  phone_main: string | null
  phone_emergency: string | null
  services: HospitalService[]
  is_24hr: boolean
  receive_alerts: boolean
  zone_id: string | null
  lat: number | null
  lng: number | null
}
