import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
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
const HealthWorkerDashboard = lazy(() =>
  import('@/views/HealthWorkerDashboard').then((m) => ({ default: m.HealthWorkerDashboard })),
)
const AdminZone = lazy(() => import('@/views/AdminZone').then((m) => ({ default: m.AdminZone })))
const DemoFlow = lazy(() => import('@/views/DemoFlow').then((m) => ({ default: m.DemoFlow })))
const FamilyStatus = lazy(() =>
  import('@/views/FamilyStatus').then((m) => ({ default: m.FamilyStatus })),
)

function RouteFallback() {
  return (
    <main id="main-content" tabIndex={-1} className="flex min-h-screen items-center justify-center outline-none">
      <LoadingSpinner />
    </main>
  )
}

export function App() {
  return (
    <>
      <SkipLink />
      <DocumentLangSync />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/signup" element={<SignupLogin />} />
          <Route path="/login" element={<Navigate to="/signup?mode=login" replace />} />

          <Route path="/sos" element={<PatientSOS />} />
          <Route path="/sos/register" element={<Navigate to="/signup" replace />} />
          <Route path="/volunteer" element={<VolunteerDashboard />} />
          <Route path="/hospital" element={<Navigate to="/" replace />} />
          <Route
            path="/register"
            element={
              <ProtectedRoute role="health_worker">
                <HealthWorkerDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/worker" element={<Navigate to="/register" replace />} />
          <Route path="/dashboard" element={<Navigate to="/register" replace />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute role="admin">
                <AdminZone />
              </ProtectedRoute>
            }
          />
          <Route path="/demo" element={<DemoFlow />} />
          <Route path="/status/:token" element={<FamilyStatus />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  )
}
