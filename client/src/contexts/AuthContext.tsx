import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  clearMamaAlertSession,
  readMamaAlertSession,
  subscribeMamaAlertSession,
  type MamaAlertRole,
  type MamaAlertSession,
} from '@/lib/mamaSession'

interface AuthContextValue {
  session: MamaAlertSession | null
  isLoading: boolean
  role: MamaAlertRole | null
  zoneId: string | null
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<MamaAlertSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setSession(readMamaAlertSession())
    setIsLoading(false)
    return subscribeMamaAlertSession(() => {
      setSession(readMamaAlertSession())
    })
  }, [])

  const logout = async () => {
    clearMamaAlertSession()
    localStorage.removeItem('mamaalert_access_token')
    localStorage.removeItem('mamaalert_refresh_token')
    localStorage.removeItem('mamaalert_role')
    localStorage.removeItem('mamaalert_zone_id')
    localStorage.removeItem('mamaalert_volunteer_phone')
    localStorage.removeItem('mamaalert_volunteer_portal_token')
  }

  const value = useMemo(
    () => ({
      session,
      isLoading,
      role: session?.role ?? null,
      zoneId: session?.zoneId ?? null,
      logout,
    }),
    [session, isLoading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuthContext must be used within AuthProvider')
  }
  return ctx
}
