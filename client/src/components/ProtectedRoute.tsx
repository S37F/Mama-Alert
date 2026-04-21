import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { useAuth } from '@/hooks/useAuth'

interface ProtectedRouteProps {
  children: ReactNode
  role?: 'admin' | 'health_worker'
}

export function ProtectedRoute({ children, role }: ProtectedRouteProps) {
  const { session, isLoading } = useAuth()

  if (isLoading) {
    return (
      <main id="main-content" tabIndex={-1} className="outline-none">
        <LoadingSpinner />
      </main>
    )
  }

  if (!session) {
    return <Navigate to="/signup" replace />
  }

  if (role === 'admin' && session.role !== 'admin') {
    return <Navigate to="/signup" replace />
  }

  if (role === 'health_worker' && session.role !== 'health_worker' && session.role !== 'admin') {
    return <Navigate to="/signup" replace />
  }

  return <>{children}</>
}
