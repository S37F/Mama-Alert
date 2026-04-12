import axios from 'axios'
import type { SosPayload } from '@/types/api'
import type { MapPoint } from '@/types/map'
import { supabase } from '@/services/supabase'

const baseURL = import.meta.env.VITE_API_URL ?? ''

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
})

let bearerToken: string | null = null
let volunteerPortalToken: string | null = null
let hospitalPortalToken: string | null = null

export function setApiBearerToken(token: string | null): void {
  bearerToken = token
}

export function setVolunteerPortalToken(token: string | null): void {
  volunteerPortalToken = token
}

export function setHospitalPortalToken(token: string | null): void {
  hospitalPortalToken = token
}

api.interceptors.request.use((config) => {
  const url = typeof config.url === 'string' ? config.url : ''
  const full = `${config.baseURL ?? ''}${url}`

  if (full.includes('/api/volunteer/') && !full.includes('/otp/')) {
    const t = volunteerPortalToken ?? localStorage.getItem('mamaalert_volunteer_portal_token')
    if (t) {
      config.headers.Authorization = `Bearer ${t}`
    }
    return config
  }

  if (full.includes('/api/hospital/')) {
    const t = hospitalPortalToken ?? localStorage.getItem('mamaalert_hospital_portal_token')
    if (t) {
      config.headers.Authorization = `Bearer ${t}`
    }
    return config
  }

  const t = bearerToken ?? localStorage.getItem('mamaalert_access_token')
  if (t) {
    config.headers.Authorization = `Bearer ${t}`
  }
  return config
})

api.interceptors.response.use(
  (r) => r,
  async (error: unknown) => {
    if (!axios.isAxiosError(error) || !error.config || error.response?.status !== 401) {
      return Promise.reject(error)
    }
    const cfg = error.config as typeof error.config & { _retry?: boolean }
    const url = typeof cfg.url === 'string' ? cfg.url : ''
    if (url.includes('/api/volunteer/') || url.includes('/api/hospital/') || url.includes('/api/public/')) {
      return Promise.reject(error)
    }
    if (cfg._retry) {
      return Promise.reject(error)
    }
    cfg._retry = true
    const rt = localStorage.getItem('mamaalert_refresh_token')
    if (!rt) {
      return Promise.reject(error)
    }
    const { data, error: refErr } = await supabase.auth.refreshSession({ refresh_token: rt })
    if (refErr || !data.session?.access_token) {
      return Promise.reject(error)
    }
    localStorage.setItem('mamaalert_access_token', data.session.access_token)
    if (data.session.refresh_token) {
      localStorage.setItem('mamaalert_refresh_token', data.session.refresh_token)
    }
    bearerToken = data.session.access_token
    cfg.headers.Authorization = `Bearer ${data.session.access_token}`
    return api(cfg)
  },
)

export function setStoredTokens(access: string, refreshToken: string): void {
  bearerToken = access
  localStorage.setItem('mamaalert_refresh_token', refreshToken)
}

export function clearStoredTokens(): void {
  bearerToken = null
}

export interface LoginResponse {
  access_token: string
  refresh_token: string
  user: { id: string; email: string | undefined }
  role: string
  zone_id: string | null
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  try {
    const response = await api.post<LoginResponse>('/api/login', { email, password })
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const msg =
        typeof error.response?.data === 'object' &&
        error.response.data !== null &&
        'error' in error.response.data &&
        typeof (error.response.data as { error: unknown }).error === 'string'
          ? (error.response.data as { error: string }).error
          : 'Login failed'
      throw new Error(msg)
    }
    throw error
  }
}

export async function logout(accessToken: string): Promise<void> {
  await api.post(
    '/api/logout',
    {},
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  )
}

export class ApiHttpError extends Error {
  readonly statusCode: number

  constructor(message: string, statusCode: number) {
    super(message)
    this.name = 'ApiHttpError'
    this.statusCode = statusCode
  }
}

export interface SosSuccessResponse {
  success: true
  alertId: string
  volunteersNotified: number
}

export interface PatientHintsResponse {
  firstName: string
  language: string
}

/** Requires SOS link token (same as PWA SOS). */
export async function postPatientHints(sosToken: string): Promise<PatientHintsResponse | null> {
  try {
    const response = await api.post<PatientHintsResponse>('/api/public/patient-hints', { sosToken })
    return response.data
  } catch {
    return null
  }
}

export async function getPatientVolunteersNearbyCount(sosToken: string): Promise<number> {
  const response = await api.get<{ count: number }>('/api/public/patient-volunteers-nearby', {
    params: { sosToken },
  })
  return response.data.count
}

export interface PublicZoneRow {
  id: string
  name: string
}

export async function getPublicZones(): Promise<PublicZoneRow[]> {
  const response = await api.get<{ zones: PublicZoneRow[] }>('/api/public/zones')
  return response.data.zones
}

export async function postPatientOtpRequest(phone: string): Promise<void> {
  await api.post('/api/public/patient-otp/request', { phone })
}

export interface PatientOtpVerifyResponse {
  sos_token: string
  firstName: string
  language: string
  weeksPregnant: number | null
}

export async function postPatientOtpVerify(phone: string, code: string): Promise<PatientOtpVerifyResponse> {
  const response = await api.post<PatientOtpVerifyResponse>('/api/public/patient-otp/verify', { phone, code })
  return response.data
}

export type EmergencyRelationship = 'husband' | 'mother' | 'sister' | 'neighbour' | 'other'

export interface PatientSelfRegisterPayload {
  name: string
  phone_primary: string
  zone_id?: string
  lat?: number
  lng?: number
  language: string
  weeks_pregnant?: number | null
  village?: string
  emergency_contacts?: { name: string; phone: string; relationship: EmergencyRelationship }[]
}

export async function postPatientSelfRegister(
  body: PatientSelfRegisterPayload,
): Promise<{ id: string; status_token: string; sos_token: string; registration_verified?: boolean }> {
  try {
    const response = await api.post<{
      id: string
      status_token: string
      sos_token: string
      registration_verified?: boolean
    }>('/api/public/patient-self-register', body)
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const d = error.response?.data
      const msg =
        typeof d === 'object' && d !== null && 'error' in d && typeof (d as { error: unknown }).error === 'string'
          ? (d as { error: string }).error
          : 'Registration failed'
      throw new Error(msg)
    }
    throw error
  }
}

export async function postSos(payload: SosPayload): Promise<SosSuccessResponse> {
  try {
    const response = await api.post<SosSuccessResponse>('/api/sos', payload)
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      const status = error.response.status
      const msg =
        typeof error.response.data === 'object' &&
        error.response.data !== null &&
        'error' in error.response.data &&
        typeof (error.response.data as { error: unknown }).error === 'string'
          ? (error.response.data as { error: string }).error
          : 'SOS failed'
      throw new ApiHttpError(msg, status)
    }
    throw error
  }
}

export interface VolunteerFeedItem {
  responseId: string
  alertId: string
  status: string
  response: string | null
  triggeredAt: string
  patientFirstName: string
  landmark: string | null
  weeksPregnant: number | null
  distanceKm: number | null
}

export async function getVolunteerFeed(): Promise<VolunteerFeedItem[]> {
  const response = await api.get<{ items: VolunteerFeedItem[] }>('/api/volunteer/feed')
  return response.data.items
}

/** Absolute or same-origin URL for volunteer live feed (SSE). Pass portal JWT as query (EventSource has no headers). */
export function volunteerSseUrl(accessToken: string): string {
  const base = import.meta.env.VITE_API_URL ?? ''
  const trimmed = base.replace(/\/$/, '')
  const q = `access_token=${encodeURIComponent(accessToken)}`
  if (trimmed.length === 0) {
    return `/api/volunteer/events?${q}`
  }
  return `${trimmed}/api/volunteer/events?${q}`
}

export async function postVolunteerOtpRequest(phone: string): Promise<void> {
  await api.post('/api/volunteer/otp/request', { phone })
}

export async function postVolunteerOtpVerify(phone: string, code: string): Promise<{
  access_token: string
  volunteer: { id: string; name: string; language: string; zone_id: string | null }
}> {
  const response = await api.post('/api/volunteer/otp/verify', { phone, code })
  return response.data as {
    access_token: string
    volunteer: { id: string; name: string; language: string; zone_id: string | null }
  }
}

export async function postVolunteerResponse(body: { alertId: string; response: 'YES' | 'NO' }): Promise<void> {
  await api.post('/api/volunteer/response', body)
}

export interface HospitalInboxItem {
  alertId: string
  status: string
  triggeredAt: string
  patientName: string
  weeksPregnant: number | null
  bloodType: string | null
  riskFlags: string[]
  volunteerName: string | null
  etaMinutes: number
}

export async function getHospitalInbox(): Promise<HospitalInboxItem[]> {
  const response = await api.get<{ items: HospitalInboxItem[] }>('/api/hospital/inbox')
  return response.data.items
}

export async function postHospitalAck(alertId: string, type: 'ready' | 'more_info'): Promise<void> {
  await api.post('/api/hospital/ack', { alertId, type })
}

export interface FamilyStatusPayload {
  patientFirstName: string
  alertStatus: string
  volunteerName: string | null
  hospitalName: string | null
  lastUpdated: string | null
}

export async function getFamilyStatus(token: string): Promise<FamilyStatusPayload> {
  const response = await api.get<FamilyStatusPayload>(`/api/status/${encodeURIComponent(token)}`)
  return response.data
}

export interface RegisterPatientPayload {
  name: string
  age?: number | null
  phone_primary: string
  phone_secondary?: string | null
  village?: string | null
  landmark?: string | null
  lat: number
  lng: number
  weeks_pregnant?: number | null
  due_date?: string | null
  prev_pregnancies?: number | null
  prev_births?: number | null
  prev_csection?: boolean
  last_anc_date?: string | null
  blood_type?: string | null
  language: string
  zone_id?: string | null
  risk_flags?: string[]
  medication_name?: string | null
  emergency_contacts?: { name: string; phone: string; relationship: EmergencyRelationship }[]
}

export async function postRegisterPatient(body: RegisterPatientPayload): Promise<{
  id: string
  status_token: string
  sos_token: string
}> {
  try {
    const response = await api.post<{ id: string; status_token: string; sos_token: string }>('/api/register/patient', body)
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const d = error.response?.data
      const msg =
        typeof d === 'object' && d !== null && 'error' in d && typeof (d as { error: unknown }).error === 'string'
          ? (d as { error: string }).error
          : 'Registration failed'
      throw new Error(msg)
    }
    throw error
  }
}

export interface RegisterVolunteerPayload {
  name: string
  phone: string
  lat: number
  lng: number
  village?: string | null
  availability_hours?: string | null
  skills?: string[]
  vehicle?: 'none' | 'motorcycle' | 'car' | 'ambulance'
  max_radius_km?: number
  language?: string
  zone_id?: string | null
}

export async function postRegisterVolunteer(body: RegisterVolunteerPayload): Promise<{ id: string }> {
  try {
    const response = await api.post<{ id: string }>('/api/register/volunteer', body)
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const d = error.response?.data
      const msg =
        typeof d === 'object' && d !== null && 'error' in d && typeof (d as { error: unknown }).error === 'string'
          ? (d as { error: string }).error
          : 'Volunteer registration failed'
      throw new Error(msg)
    }
    throw error
  }
}

export interface RegisterHospitalPayload {
  name: string
  type?: string
  lat: number
  lng: number
  phone_main?: string | null
  phone_emergency?: string | null
  services?: string[]
  is_24hr?: boolean
  receive_alerts?: boolean
  zone_id?: string | null
}

export async function postRegisterHospital(body: RegisterHospitalPayload): Promise<{ id: string }> {
  try {
    const response = await api.post<{ id: string }>('/api/register/hospital', body)
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const d = error.response?.data
      const msg =
        typeof d === 'object' && d !== null && 'error' in d && typeof (d as { error: unknown }).error === 'string'
          ? (d as { error: string }).error
          : 'Hospital registration failed'
      throw new Error(msg)
    }
    throw error
  }
}

export interface AdminPatientRow {
  id: string
  name: string
  healthWorkerName: string
  weeksPregnant: number | null
  riskFlags: string[]
  lastAncDate: string | null
  overdueAnc: boolean
}

export async function getAdminPatients(): Promise<AdminPatientRow[]> {
  const response = await api.get<{ patients: AdminPatientRow[] }>('/api/admin/patients')
  return response.data.patients
}

export interface AdminVolunteerRow {
  id: string
  name: string
  skills: string[]
  vehicle: string
  max_radius_km: number
  is_active: boolean
  last_response_at: string | null
}

export async function getAdminVolunteers(): Promise<AdminVolunteerRow[]> {
  const response = await api.get<{ volunteers: AdminVolunteerRow[] }>('/api/admin/volunteers')
  return response.data.volunteers
}

export async function patchVolunteerActive(id: string, active: boolean): Promise<void> {
  await api.patch(`/api/admin/volunteers/${encodeURIComponent(id)}/active`, { active })
}

export interface AdminAlertHistoryRow {
  id: string
  patientName: string
  triggeredAt: string
  volunteerConfirmMs: number | null
  resolveTimeMs: number | null
  volunteerName: string | null
  outcome: string
}

export async function getAdminAlertsHistory(): Promise<{
  alerts: AdminAlertHistoryRow[]
  avgVolunteerConfirmMs: number | null
  avgResolveMs: number | null
  avgResponseMs: number | null
}> {
  const response = await api.get<{
    alerts: AdminAlertHistoryRow[]
    avgVolunteerConfirmMs: number | null
    avgResolveMs: number | null
    avgResponseMs: number | null
  }>('/api/admin/alerts-history')
  return response.data
}

export interface AdminMapPoints {
  patients: MapPoint[]
  volunteers: MapPoint[]
  hospitals: MapPoint[]
  activeAlerts: { alert_id: string; lat: number; lng: number }[]
}

export async function getAdminMapPoints(): Promise<AdminMapPoints> {
  const response = await api.get<AdminMapPoints>('/api/admin/map-points')
  return response.data
}

export async function patchAdminHospital(id: string, receive_alerts: boolean): Promise<void> {
  await api.patch(`/api/admin/hospitals/${encodeURIComponent(id)}`, { receive_alerts })
}

export async function postAdminHospitalPortalToken(hospitalId: string): Promise<{ token: string }> {
  const response = await api.post<{ token: string }>(
    `/api/admin/hospitals/${encodeURIComponent(hospitalId)}/portal-token`,
  )
  return response.data
}

export interface AdminZoneEscalation {
  id: string
  name: string
  escalation_r1_m: number | null
  escalation_r2_m: number | null
  escalation_r3_m: number | null
  escalation_delay_ms: number | null
}

export async function getAdminZoneEscalation(): Promise<AdminZoneEscalation> {
  const response = await api.get<{ zone: AdminZoneEscalation }>('/api/admin/zone-escalation')
  return response.data.zone
}

export async function patchAdminZoneEscalation(body: {
  escalation_r1_m?: number | null
  escalation_r2_m?: number | null
  escalation_r3_m?: number | null
  escalation_delay_ms?: number | null
}): Promise<void> {
  await api.patch('/api/admin/zone-escalation', body)
}

export interface AdminHealthWorkerRow {
  user_id: string
  name: string
  phone: string | null
  access_level: string
}

export async function getAdminHealthWorkers(): Promise<AdminHealthWorkerRow[]> {
  const response = await api.get<{ healthWorkers: AdminHealthWorkerRow[] }>('/api/admin/health-workers')
  return response.data.healthWorkers
}

export async function postAdminInviteHealthWorker(body: {
  email: string
  name: string
  phone?: string
}): Promise<void> {
  await api.post('/api/admin/health-workers/invite', body)
}

export type { MapPoint } from '@/types/map'

export interface WorkerPatientRow {
  id: string
  name: string
  weeksPregnant: number | null
  riskFlags: string[]
  lastAncDate: string | null
  overdueAnc: boolean
  phonePrimary: string
  village: string | null
  registrationVerified: boolean
  registrationSource: string
}

export async function getWorkerPatients(): Promise<WorkerPatientRow[]> {
  const response = await api.get<{ patients: WorkerPatientRow[] }>('/api/worker/patients')
  return response.data.patients
}

export async function patchWorkerPatient(
  patientId: string,
  body: {
    name?: string
    village?: string | null
    weeks_pregnant?: number | null
    lat?: number
    lng?: number
    risk_flags?: string[]
    emergency_contacts?: { name: string; phone: string; relationship: EmergencyRelationship }[]
    complete_profile?: boolean
  },
): Promise<void> {
  await api.patch(`/api/worker/patients/${encodeURIComponent(patientId)}`, body)
}

export interface WorkerVolunteerRow {
  id: string
  name: string
  skills: string[] | null
  vehicle: string | null
  max_radius_km: number
  is_active: boolean
  last_response_at: string | null
}

export async function getWorkerVolunteers(): Promise<WorkerVolunteerRow[]> {
  const response = await api.get<{ volunteers: WorkerVolunteerRow[] }>('/api/worker/volunteers')
  return response.data.volunteers
}

export interface CoordinatorAlertItem {
  id: string
  status: string
  priority: number
  triggered_at: string
  patient: {
    name: string
    landmark: string | null
    weeks_pregnant: number | null
  }
  responding_volunteer_name: string | null
}

export async function getCoordinatorAlerts(): Promise<CoordinatorAlertItem[]> {
  const response = await api.get<CoordinatorAlertItem[]>('/api/alerts')
  return response.data
}
