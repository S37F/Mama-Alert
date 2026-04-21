import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { redirectForRole, type MamaAlertRole } from '@/lib/mamaSession'
import { AdminSignupForm } from '@/views/signup/AdminSignupForm'
import { HealthWorkerSignupForm } from '@/views/signup/HealthWorkerSignupForm'
import { LoginForm } from '@/views/signup/LoginForm'
import { PatientSignupForm } from '@/views/signup/PatientSignupForm'
import { RolePicker } from '@/views/signup/RolePicker'
import { VolunteerSignupForm } from '@/views/signup/VolunteerSignupForm'

type AuthMode = 'signup' | 'login'

export function SignupLogin() {
  const { session } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [mode, setMode] = useState<AuthMode>(() => (searchParams.get('mode') === 'login' ? 'login' : 'signup'))
  const [selectedRole, setSelectedRole] = useState<MamaAlertRole | null>(null)
  const [step, setStep] = useState<1 | 2>(1)

  useEffect(() => {
    const wantedMode = searchParams.get('mode') === 'login' ? 'login' : 'signup'
    if (wantedMode !== mode) {
      setMode(wantedMode)
    }
  }, [mode, searchParams])

  useEffect(() => {
    if (session) {
      window.location.replace(redirectForRole(session.role))
    }
  }, [session])

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode)
    setSelectedRole(null)
    setStep(1)
    const next = new URLSearchParams(searchParams)
    if (nextMode === 'login') {
      next.set('mode', 'login')
    } else {
      next.delete('mode')
    }
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
      return <PatientSignupForm onBack={() => { setStep(1); setSelectedRole(null) }} />
    }
    if (selectedRole === 'volunteer') {
      return <VolunteerSignupForm onBack={() => { setStep(1); setSelectedRole(null) }} />
    }
    if (selectedRole === 'health_worker') {
      return <HealthWorkerSignupForm onBack={() => { setStep(1); setSelectedRole(null) }} />
    }
    if (selectedRole === 'admin') {
      return <AdminSignupForm onBack={() => { setStep(1); setSelectedRole(null) }} />
    }
    return null
  }

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff4ec,_#fdfaf6_48%,_#f6ede3)] px-4 py-8 outline-none sm:px-6"
    >
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center justify-center">
        <div className="grid w-full max-w-4xl overflow-hidden rounded-[32px] border border-[#EAD7C6] bg-white shadow-[0_30px_80px_rgba(78,55,41,0.12)] lg:grid-cols-[0.9fr_1.1fr]">
          <section className="hidden bg-[#3D241B] px-10 py-12 text-[#F8EEE6] lg:flex lg:flex-col lg:justify-between">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-3">
                <span className="h-3 w-3 rounded-full bg-[#C4522A]" />
                <span className="font-serif text-2xl font-bold">MamaAlert</span>
              </div>
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#E9B397]">
                  Community maternal emergency network
                </p>
                <h1 className="font-serif text-5xl font-bold leading-[1.05]">
                  One route for every role.
                </h1>
                <p className="max-w-md text-base leading-7 text-[#E5CDC1]">
                  Sign up or log in with a phone number, then go straight where you need to be. Patients reach SOS.
                  Volunteers see live alerts. Workers and admins land in their dashboards.
                </p>
              </div>
            </div>

            <div className="space-y-3 rounded-[24px] border border-white/10 bg-white/5 p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#E9B397]">What changed</p>
              <p className="text-sm leading-7 text-[#F5E7DE]">
                Phone-only access replaces the old split flows. Choose a role once, fill the matching form, and the
                app takes you the rest of the way.
              </p>
            </div>
          </section>

          <section className="px-5 py-6 sm:px-8 sm:py-8">
            <div className="mx-auto max-w-md space-y-6">
              <div className="space-y-3 text-center lg:text-left">
                <div className="inline-flex rounded-full border border-[#E6D5C7] bg-[#F5E8DC] p-1">
                  <button
                    type="button"
                    className={`rounded-full px-5 py-2 text-sm font-medium transition ${
                      mode === 'signup' ? 'bg-[#C4522A] text-white shadow-sm' : 'text-[#7B645A]'
                    }`}
                    onClick={() => switchMode('signup')}
                  >
                    Sign Up
                  </button>
                  <button
                    type="button"
                    className={`rounded-full px-5 py-2 text-sm font-medium transition ${
                      mode === 'login' ? 'bg-[#C4522A] text-white shadow-sm' : 'text-[#7B645A]'
                    }`}
                    onClick={() => switchMode('login')}
                  >
                    Login
                  </button>
                </div>
                <div className="lg:hidden">
                  <h1 className="font-serif text-4xl font-bold text-[#36251D]">MamaAlert</h1>
                  <p className="mt-2 text-sm text-[#7B645A]">Community maternal emergency network</p>
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
