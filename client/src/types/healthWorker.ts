export type AccessLevel = 'health_worker' | 'admin'

export interface HealthWorker {
  id: string
  user_id: string
  name: string
  phone: string | null
  zone_id: string | null
  access_level: AccessLevel
}
