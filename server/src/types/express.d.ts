export type HealthWorkerContext = {
  access_level: 'health_worker' | 'admin'
  zone_id: string | null
}

export type VolunteerPortalContext = {
  volunteerId: string
  phoneE164: string
}

declare module 'express-serve-static-core' {
  interface Request {
    requestId?: string
    authUserId?: string
    healthWorker?: HealthWorkerContext
    volunteerPortal?: VolunteerPortalContext
    hospitalPortal?: { hospitalId: string }
  }
}
