export type TriggerMethod = 'pwa' | 'sms' | 'ussd'

export interface SosPayload {
  phone: string
  triggerMethod: TriggerMethod
}

export interface ApiErrorBody {
  error: string
  details?: unknown
}
