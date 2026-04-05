export type TriggerMethod = 'pwa' | 'sms' | 'ussd'

export interface SosPayload {
  phone: string
  triggerMethod: TriggerMethod
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
