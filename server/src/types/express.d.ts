export type HealthWorkerContext = {
  access_level: 'health_worker' | 'admin'
  zone_id: string | null
}

declare module 'express-serve-static-core' {
  interface Request {
    authUserId?: string
    healthWorker?: HealthWorkerContext
  }
}
