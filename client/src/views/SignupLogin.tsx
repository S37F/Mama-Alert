import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BrandLogo } from '@/components/BrandLogo'
import { useAuth } from '@/hooks/useAuth'
import { redirectForRole, type MamaAlertRole } from '@/lib/mamaSession'
import { AdminSignupForm } from '@/views/signup/AdminSignupForm'
import { HealthWorkerSignupForm } from '@/views/signup/HealthWorkerSignupForm'
import { LoginForm } from '@/views/signup/LoginForm'
import { PatientSignupForm } from '@/views/signup/PatientSignupForm'
import { RolePicker } from '@/views/signup/RolePicker'
import { VolunteerSignupForm } from '@/views/signup/VolunteerSignupForm'

type AuthMode = 'signup' | 'login'
const SIGNUP_ROLES: MamaAlertRole[] = ['patient', 'volunteer', 'health_worker', 'admin']

export function SignupLogin() {
  const { session } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const mode: AuthMode = searchParams.get('mode') === 'login' ? 'login' : 'signup'
  const roleParam = searchParams.get('role') as MamaAlertRole | null
  const initialRole = mode === 'signup' && roleParam && SIGNUP_ROLES.includes(roleParam) ? roleParam : null
  const [selectedRole, setSelectedRole] = useState<MamaAlertRole | null>(initialRole)
  const [step, setStep] = useState<1 | 2>(initialRole ? 2 : 1)

  useEffect(() => {
    if (session) {
      window.location.replace(redirectForRole(session.role))
    }
  }, [session])

  const switchMode = (nextMode: AuthMode) => {
    setSelectedRole(null)
    setStep(1)
    const next = new URLSearchParams(searchParams)
    next.delete('role')
    if (nextMode === 'login') {
      next.set('mode', 'login')
    } else {
      next.delete('mode')
    }
    setSearchParams(next, { replace: true })
  }

  const backToRolePicker = () => {
    setStep(1)
    setSelectedRole(null)
    const next = new URLSearchParams(searchParams)
    next.delete('role')
    setSearchParams(next, { replace: true })
  }

  const renderSignupStep = () => {
    if (step === 1) {
      return (
        <RolePicker
          selectedRole={selectedRole}
          onSelect={setSelectedRole}
          onContinue={() => {
            if (selectedRole) {
              setStep(2)
            }
          }}
        />
      )
    }

    if (selectedRole === 'patient') {
      return <PatientSignupForm onBack={backToRolePicker} />
    }
    if (selectedRole === 'volunteer') {
      return <VolunteerSignupForm onBack={backToRolePicker} />
    }
    if (selectedRole === 'health_worker') {
      return <HealthWorkerSignupForm onBack={backToRolePicker} />
    }
    if (selectedRole === 'admin') {
      return <AdminSignupForm onBack={backToRolePicker} />
    }
    return null
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
                  Sign up or log in with a phone number, then go straight where you need to be. Patients reach SOS.
                  Volunteers see live alerts. Workers and admins land in their dashboards.
                </p>
              </div>
            </div>

            <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--mama-terra-light)]">What changed</p>
              <p className="text-sm leading-7 text-[var(--mama-sand)]">
                Phone-only access replaces the old split flows. Choose a role once, fill the matching form, and the
                app takes you the rest of the way.
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

              {mode === 'signup' ? renderSignupStep() : <LoginForm />}
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
