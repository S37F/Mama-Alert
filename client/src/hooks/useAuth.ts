import { useAuthContext } from '@/contexts/AuthContext'
import type { MamaAlertRole, MamaAlertSession } from '@/lib/mamaSession'

export function useAuth(): {
  session: MamaAlertSession | null
  isLoading: boolean
  logout: () => Promise<void>
  role: MamaAlertRole | null
} {
  const ctx = useAuthContext()
  return {
    session: ctx.session,
    isLoading: ctx.isLoading,
    logout: ctx.logout,
    role: ctx.role,
  }
}
