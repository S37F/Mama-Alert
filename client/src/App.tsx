import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppHeader } from '@/components/AppHeader'
import { DocumentLangSync } from '@/components/DocumentLangSync'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { SkipLink } from '@/components/SkipLink'
import { ProtectedRoute } from '@/components/ProtectedRoute'

const LandingPage = lazy(() =>
  import('@/landing/LandingPage').then((m) => ({ default: m.LandingPage })),
)
const PatientSOS = lazy(() =>
  import('@/views/PatientSOS').then((m) => ({ default: m.PatientSOS })),
)
const SignupLogin = lazy(() =>
  import('@/views/SignupLogin').then((m) => ({ default: m.SignupLogin })),
)
const VolunteerDashboard = lazy(() =>
  import('@/views/VolunteerDashboard').then((m) => ({ default: m.VolunteerDashboard })),
)
const DemoFlow = lazy(() => import('@/views/DemoFlow').then((m) => ({ default: m.DemoFlow })))
const FamilyStatus = lazy(() =>
  import('@/views/FamilyStatus').then((m) => ({ default: m.FamilyStatus })),
)
const HospitalInbox = lazy(() =>
  import('@/views/HospitalInbox').then((m) => ({ default: m.HospitalInbox })),
)
const PatientSelfRegister = lazy(() =>
  import('@/views/PatientSelfRegister').then((m) => ({ default: m.PatientSelfRegister })),
)

function RouteFallback() {
  return (
    <main id="main-content" tabIndex={-1} className="flex min-h-screen items-center justify-center outline-none">
      <LoadingSpinner />
    </main>
  )
}

export function App() {
  const { pathname } = useLocation()
  const showAppHeader = pathname !== '/' && !pathname.startsWith('/sos')

  return (
    <>
      <SkipLink />
      <DocumentLangSync />
      {showAppHeader ? <AppHeader /> : null}
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/signup" element={<SignupLogin />} />
          <Route path="/login" element={<Navigate to="/signup?mode=login" replace />} />

          <Route path="/sos" element={<PatientSOS />} />
          <Route path="/sos/register" element={<PatientSelfRegister />} />
          <Route
            path="/volunteer"
            element={
              <ProtectedRoute role="volunteer" redirectTo="/signup?mode=login">
                <VolunteerDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/hospital" element={<HospitalInbox />} />
          <Route path="/demo" element={<DemoFlow />} />
          <Route path="/status/:token" element={<FamilyStatus />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  )
}
