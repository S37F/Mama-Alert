import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { BrandLogo } from '@/components/BrandLogo'
import { useAuth } from '@/hooks/useAuth'
import { redirectForRole } from '@/lib/mamaSession'
import { LoginForm } from '@/views/signup/LoginForm'
import { VolunteerSignupForm } from '@/views/signup/VolunteerSignupForm'

type AuthMode = 'signup' | 'login'

export function SignupLogin() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const mode: AuthMode = searchParams.get('mode') === 'login' ? 'login' : 'signup'
  const roleParam = searchParams.get('role')

  useEffect(() => {
    if (mode === 'signup' && roleParam === 'patient') {
      navigate('/sos/register', { replace: true })
    }
  }, [mode, roleParam, navigate])

  useEffect(() => {
    if (session) {
      window.location.replace(redirectForRole(session.role))
    }
  }, [session])

  const switchMode = (nextMode: AuthMode) => {
    const next = new URLSearchParams(searchParams)
    next.delete('role')
    if (nextMode === 'login') {
      next.set('mode', 'login')
    } else {
      next.delete('mode')
    }
    setSearchParams(next, { replace: true })
  }

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mama-page px-4 py-8 outline-none sm:px-6"
    >
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center justify-center">
        <div className="mama-panel grid w-full max-w-4xl overflow-hidden lg:grid-cols-[0.9fr_1.1fr]">
          <section className="hidden bg-[var(--mama-brown)] px-10 py-12 text-[var(--mama-cream)] lg:flex lg:flex-col lg:justify-between">
            <div className="space-y-5">
              <BrandLogo tone="dark" size="md" animated />
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--mama-terra-light)]">
                  Community maternal emergency network
                </p>
                <h1 className="mama-heading text-5xl leading-[1.05] text-[var(--mama-cream)]">
                  One route for every role.
                </h1>
                <p className="max-w-md text-base leading-7 text-[var(--mama-sand-dark)]">
                  Patients register once on SOS with full details for volunteers and clinics. Volunteers join here by
                  phone. Clinics use their portal token.
                </p>
              </div>
            </div>

            <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--mama-terra-light)]">
                Patients
              </p>
              <p className="text-sm leading-7 text-[var(--mama-sand)]">
                New patients should use <span className="font-medium">Register myself</span> from the SOS screen — not
                this page.
              </p>
            </div>
          </section>

          <section className="px-5 py-6 sm:px-8 sm:py-8">
            <div className="mx-auto max-w-md space-y-6">
              <div className="space-y-3 text-center lg:text-left">
                <div className="inline-flex rounded-full border border-border bg-secondary p-1">
                  <button
                    type="button"
                    className={`rounded-full px-5 py-2 text-sm font-medium transition ${
                      mode === 'signup' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'
                    }`}
                    onClick={() => switchMode('signup')}
                  >
                    Sign Up
                  </button>
                  <button
                    type="button"
                    className={`rounded-full px-5 py-2 text-sm font-medium transition ${
                      mode === 'login' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'
                    }`}
                    onClick={() => switchMode('login')}
                  >
                    Login
                  </button>
                </div>
                <div className="lg:hidden">
                  <BrandLogo tone="light" size="lg" stacked animated className="justify-center" />
                  <p className="mama-copy mt-2 text-sm">Community maternal emergency network</p>
                </div>
              </div>

              {mode === 'signup' ? (
                <VolunteerSignupForm onBack={() => navigate('/')} />
              ) : (
                <LoginForm />
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
