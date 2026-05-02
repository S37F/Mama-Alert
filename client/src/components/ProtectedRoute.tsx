import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { useAuth } from '@/hooks/useAuth'
import type { MamaAlertRole } from '@/lib/mamaSession'

interface ProtectedRouteProps {
  children: ReactNode
  /** When set, only this role may view the route. */
  role?: MamaAlertRole
  /** Where to send unauthenticated users or wrong-role sessions. Defaults to `/signup`. */
  redirectTo?: string
}

export function ProtectedRoute({ children, role, redirectTo }: ProtectedRouteProps) {
  const { session, isLoading } = useAuth()
  const fallback = redirectTo ?? '/signup'

  if (isLoading) {
    return (
      <main id="main-content" tabIndex={-1} className="outline-none">
        <LoadingSpinner />
      </main>
    )
  }

  if (!session) {
    return <Navigate to={fallback} replace />
  }

  if (role !== undefined && session.role !== role) {
    return <Navigate to={fallback} replace />
  }

  return <>{children}</>
}
