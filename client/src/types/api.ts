export type TriggerMethod = 'pwa' | 'sms' | 'ussd'

export interface SosPayload {
  sosToken?: string
  phone?: string
  triggerMethod: 'pwa'
  incapacitationSuspected?: boolean
}

export interface ApiError {
  error: string
  details?: unknown
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
}

export interface PendingAlert {
  id: string
  payload: SosPayload
  createdAt: string
}
