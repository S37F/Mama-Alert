import type { ReactNode } from 'react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'

interface ProtectedRouteProps {
  children: ReactNode
  /** If set, only that role may access (admins cannot use `health_worker`-only routes). */
  role?: 'admin' | 'health_worker'
}

export function ProtectedRoute({ children, role }: ProtectedRouteProps) {
  const { t } = useTranslation()
  const { user, isLoading, login, role: userRole, logout } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
        <div className="w-full max-w-sm space-y-4">
          <h1 className="text-center text-2xl font-semibold">{t('auth.required')}</h1>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              setError(null)
              setSubmitting(true)
              void login(email, password)
                .catch((err: unknown) => {
                  setError(err instanceof Error ? err.message : t('common.error'))
                })
                .finally(() => setSubmitting(false))
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="auth-email">{t('auth.email')}</Label>
              <Input
                id="auth-email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="auth-password">{t('auth.password')}</Label>
              <Input
                id="auth-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            {error ? <ErrorMessage message={error} onRetry={() => setError(null)} /> : null}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? t('common.loading') : t('auth.submit')}
            </Button>
          </form>
        </div>
      </div>
    )
  }

  if (role === 'admin' && userRole !== 'admin') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-lg font-medium">{t('auth.adminRequired')}</p>
        <Button type="button" variant="outline" onClick={() => void logout()}>
          {t('auth.signOut')}
        </Button>
      </div>
    )
  }

  if (role === 'health_worker' && userRole !== 'health_worker') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-lg font-medium">{t('worker.healthWorkerOnly')}</p>
        <Button type="button" variant="outline" onClick={() => void logout()}>
          {t('auth.signOut')}
        </Button>
      </div>
    )
  }

  return <>{children}</>
}
