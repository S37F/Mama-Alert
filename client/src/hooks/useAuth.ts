import type { Session, User } from '@supabase/supabase-js'
import { useAuthContext } from '@/contexts/AuthContext'

/** Matches CURSOR_PROMPT Phase 4.2. For NGO zone UUID after login, use `useZoneId`. */
export function useAuth(): {
  user: User | null
  session: Session | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  role: 'health_worker' | 'admin' | null
} {
  const ctx = useAuthContext()
  return {
    user: ctx.user,
    session: ctx.session,
    isLoading: ctx.isLoading,
    login: ctx.login,
    logout: ctx.logout,
    role: ctx.role,
  }
}
