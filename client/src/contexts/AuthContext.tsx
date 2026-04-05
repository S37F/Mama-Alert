import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/services/supabase'
import {
  clearStoredTokens,
  login as apiLogin,
  logout as apiLogout,
  setApiBearerToken,
  setStoredTokens,
} from '@/services/api'

export type AppRole = 'health_worker' | 'admin' | null

interface AuthContextValue {
  user: User | null
  session: Session | null
  accessToken: string | null
  isLoading: boolean
  role: AppRole
  zoneId: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const TOKEN_KEY = 'mamaalert_access_token'
const REFRESH_KEY = 'mamaalert_refresh_token'
const ROLE_KEY = 'mamaalert_role'
const ZONE_KEY = 'mamaalert_zone_id'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [role, setRole] = useState<AppRole>(() => {
    const r = localStorage.getItem(ROLE_KEY)
    return r === 'admin' || r === 'health_worker' ? r : null
  })
  const [zoneId, setZoneId] = useState<string | null>(() => localStorage.getItem(ZONE_KEY))
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const at = localStorage.getItem(TOKEN_KEY)
      const rt = localStorage.getItem(REFRESH_KEY)
      if (at && rt) {
        const { data, error } = await supabase.auth.setSession({
          access_token: at,
          refresh_token: rt,
        })
        if (!error && data.session) {
          setSession(data.session)
          setUser(data.session.user)
          setAccessToken(data.session.access_token)
          setApiBearerToken(data.session.access_token)
          const r = localStorage.getItem(ROLE_KEY)
          setRole(r === 'admin' || r === 'health_worker' ? r : null)
          setZoneId(localStorage.getItem(ZONE_KEY))
        } else {
          clearStoredTokens()
          setApiBearerToken(null)
          setAccessToken(null)
          setSession(null)
          setUser(null)
        }
      } else {
        const { data } = await supabase.auth.getSession()
        if (data.session) {
          setSession(data.session)
          setUser(data.session.user)
        }
      }
      setIsLoading(false)
    }
    void init()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      if (nextSession?.access_token) {
        setAccessToken(nextSession.access_token)
        setApiBearerToken(nextSession.access_token)
        localStorage.setItem(TOKEN_KEY, nextSession.access_token)
        if (nextSession.refresh_token) {
          localStorage.setItem(REFRESH_KEY, nextSession.refresh_token)
        }
      }
      if (!nextSession) {
        setAccessToken(null)
        setApiBearerToken(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const out = await apiLogin(email, password)
    setStoredTokens(out.access_token, out.refresh_token)
    setApiBearerToken(out.access_token)
    localStorage.setItem(TOKEN_KEY, out.access_token)
    localStorage.setItem(REFRESH_KEY, out.refresh_token)
    const { data, error } = await supabase.auth.setSession({
      access_token: out.access_token,
      refresh_token: out.refresh_token,
    })
    if (error) {
      throw new Error(error.message)
    }
    if (data.session) {
      setSession(data.session)
      setUser(data.session.user)
    }
    setAccessToken(out.access_token)
    const r: AppRole = out.role === 'admin' ? 'admin' : 'health_worker'
    setRole(r)
    setZoneId(out.zone_id)
    localStorage.setItem(ROLE_KEY, r)
    if (out.zone_id) {
      localStorage.setItem(ZONE_KEY, out.zone_id)
    } else {
      localStorage.removeItem(ZONE_KEY)
    }
  }, [])

  const logout = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (token) {
      try {
        await apiLogout(token)
      } catch {
        /* still clear local session */
      }
    }
    clearStoredTokens()
    setApiBearerToken(null)
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_KEY)
    await supabase.auth.signOut()
    setAccessToken(null)
    setSession(null)
    setUser(null)
    setRole(null)
    setZoneId(null)
    localStorage.removeItem(ROLE_KEY)
    localStorage.removeItem(ZONE_KEY)
  }, [])

  const value = useMemo(
    () => ({
      user,
      session,
      accessToken,
      isLoading,
      role,
      zoneId,
      login,
      logout,
    }),
    [user, session, accessToken, isLoading, role, zoneId, login, logout],
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
