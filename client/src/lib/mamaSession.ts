export type MamaAlertRole = 'patient' | 'volunteer' | 'health_worker' | 'admin'

export interface MamaAlertSession {
  phone: string
  role: MamaAlertRole
  profileId: string
  name: string
  signedInAt: number
  zoneId?: string | null
  sosToken?: string
  volunteerPortalToken?: string
}

export const MAMA_ALERT_SESSION_KEY = 'mamaalert_session'
const SESSION_EVENT = 'mamaalert-session'

function isMamaAlertRole(value: unknown): value is MamaAlertRole {
  return value === 'patient' || value === 'volunteer' || value === 'health_worker' || value === 'admin'
}

export function readMamaAlertSession(): MamaAlertSession | null {
  if (typeof window === 'undefined') {
    return null
  }
  const raw = window.localStorage.getItem(MAMA_ALERT_SESSION_KEY)
  if (!raw) {
    return null
  }
  try {
    const parsed = JSON.parse(raw) as Partial<MamaAlertSession>
    if (
      typeof parsed.phone !== 'string' ||
      typeof parsed.profileId !== 'string' ||
      typeof parsed.name !== 'string' ||
      typeof parsed.signedInAt !== 'number' ||
      !isMamaAlertRole(parsed.role)
    ) {
      return null
    }
    return {
      phone: parsed.phone,
      role: parsed.role,
      profileId: parsed.profileId,
      name: parsed.name,
      signedInAt: parsed.signedInAt,
      ...(parsed.zoneId !== undefined ? { zoneId: parsed.zoneId } : {}),
      ...(typeof parsed.sosToken === 'string' ? { sosToken: parsed.sosToken } : {}),
      ...(typeof parsed.volunteerPortalToken === 'string'
        ? { volunteerPortalToken: parsed.volunteerPortalToken }
        : {}),
    }
  } catch {
    return null
  }
}

function dispatchSessionEvent(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(SESSION_EVENT))
  }
}

export function writeMamaAlertSession(session: MamaAlertSession): void {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.setItem(MAMA_ALERT_SESSION_KEY, JSON.stringify(session))
  dispatchSessionEvent()
}

export function clearMamaAlertSession(): void {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.removeItem(MAMA_ALERT_SESSION_KEY)
  dispatchSessionEvent()
}

export function subscribeMamaAlertSession(onChange: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => undefined
  }

  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === MAMA_ALERT_SESSION_KEY) {
      onChange()
    }
  }
  const onLocal = () => onChange()

  window.addEventListener('storage', onStorage)
  window.addEventListener(SESSION_EVENT, onLocal)
  return () => {
    window.removeEventListener('storage', onStorage)
    window.removeEventListener(SESSION_EVENT, onLocal)
  }
}

export function redirectForRole(role: MamaAlertRole): string {
  if (role === 'patient') {
    return '/sos'
  }
  if (role === 'volunteer') {
    return '/volunteer'
  }
  if (role === 'admin') {
    return '/admin'
  }
  return '/register'
}
