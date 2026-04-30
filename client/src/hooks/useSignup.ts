import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { redirectForRole, writeMamaAlertSession, type MamaAlertSession } from '@/lib/mamaSession'
import { postAuthLoginRequest, postAuthLoginVerify, postAuthSignup } from '@/services/api'

function clearLegacyRoleState(): void {
  localStorage.removeItem('mamaalert_sos_token')
  localStorage.removeItem('mamaalert_patient_phone')
  localStorage.removeItem('mamaalert_patient_display_name')
  localStorage.removeItem('mamaalert_patient_weeks')
  localStorage.removeItem('mamaalert_volunteer_phone')
  localStorage.removeItem('mamaalert_volunteer_portal_token')
}

function syncLegacyRoleState(session: MamaAlertSession, extras?: { weeksPregnant?: number | null }): void {
  clearLegacyRoleState()

  if (session.role === 'patient') {
    localStorage.setItem('mamaalert_patient_phone', session.phone)
    localStorage.setItem('mamaalert_patient_display_name', session.name.split(/\s+/)[0] ?? session.name)
    if (session.sosToken) {
      localStorage.setItem('mamaalert_sos_token', session.sosToken)
    }
    if (typeof extras?.weeksPregnant === 'number') {
      localStorage.setItem('mamaalert_patient_weeks', String(extras.weeksPregnant))
    }
  }

  if (session.role === 'volunteer') {
    localStorage.setItem('mamaalert_volunteer_phone', session.phone)
    if (session.volunteerPortalToken) {
      localStorage.setItem('mamaalert_volunteer_portal_token', session.volunteerPortalToken)
    }
  }
}

async function tryCaptureLocation(): Promise<{ lat?: number; lng?: number }> {
  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
    return {}
  }

  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 6000,
        maximumAge: 120_000,
      })
    })
    return {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    }
  } catch {
    return {}
  }
}

export function useSignup() {
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const requestLoginCode = async (phone: string) => {
    setIsSubmitting(true)
    setError(null)
    try {
      await postAuthLoginRequest(phone)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not send login code'
      setError(message)
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }

  const verifyLoginCode = async (phone: string, code: string) => {
    setIsSubmitting(true)
    setError(null)
    try {
      const response = await postAuthLoginVerify(phone, code)
      await tryCaptureLocation()
      writeMamaAlertSession(response.session)
      syncLegacyRoleState(response.session)
      navigate(redirectForRole(response.session.role), { replace: true })
      return response.session
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed'
      setError(message)
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }

  const signup = async <TBody extends Record<string, unknown>>(
    body: TBody,
    options?: { captureLocation?: boolean; weeksPregnant?: number | null },
  ) => {
    setIsSubmitting(true)
    setError(null)
    try {
      const location = options?.captureLocation ? await tryCaptureLocation() : {}
      const response = await postAuthSignup({
        ...body,
        ...location,
      })
      writeMamaAlertSession(response.session)
      syncLegacyRoleState(response.session, { weeksPregnant: options?.weeksPregnant ?? null })
      navigate(redirectForRole(response.session.role), { replace: true })
      return response.session
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign up failed'
      setError(message)
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    error,
    isSubmitting,
    clearError: () => setError(null),
    requestLoginCode,
    verifyLoginCode,
    signup,
  }
}
