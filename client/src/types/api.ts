export type TriggerMethod = 'pwa' | 'sms' | 'ussd'

export interface SosPayload {
  sosToken: string
  triggerMethod: 'pwa'
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
