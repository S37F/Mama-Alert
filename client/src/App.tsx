import { Navigate, Route, Routes } from 'react-router-dom'
import { DocumentLangSync } from '@/components/DocumentLangSync'
import { SkipLink } from '@/components/SkipLink'
import { LandingPage } from '@/landing/LandingPage'
import { AdminZone } from '@/views/AdminZone'
import { DemoFlow } from '@/views/DemoFlow'
import { FamilyStatus } from '@/views/FamilyStatus'
import { HealthWorkerDashboard } from '@/views/HealthWorkerDashboard'
import { HealthWorkerRegister } from '@/views/HealthWorkerRegister'
import { HospitalInbox } from '@/views/HospitalInbox'
import { PatientSOS } from '@/views/PatientSOS'
import { PatientSelfRegister } from '@/views/PatientSelfRegister'
import { VolunteerDashboard } from '@/views/VolunteerDashboard'
import { ProtectedRoute } from '@/components/ProtectedRoute'

const hospitalPortalEnabled = import.meta.env.VITE_ENABLE_HOSPITAL_PORTAL === 'true'

export function App() {
  return (
    <>
      <SkipLink />
      <DocumentLangSync />
      <Routes>
      <Route path="/" element={<LandingPage />} />

      <Route path="/sos" element={<PatientSOS />} />
      <Route path="/sos/register" element={<PatientSelfRegister />} />
      <Route path="/app" element={<PatientSOS />} />
      <Route path="/app/sos" element={<PatientSOS />} />
      <Route path="/app/sos/register" element={<PatientSelfRegister />} />
      <Route path="/app/volunteer" element={<VolunteerDashboard />} />
      <Route path="/volunteer" element={<VolunteerDashboard />} />
      {hospitalPortalEnabled ? (
        <>
          <Route path="/app/hospital" element={<HospitalInbox />} />
          <Route path="/hospital" element={<HospitalInbox />} />
        </>
      ) : (
        <>
          <Route path="/app/hospital" element={<Navigate to="/" replace />} />
          <Route path="/hospital" element={<Navigate to="/" replace />} />
        </>
      )}
      <Route
        path="/app/worker"
        element={
          <ProtectedRoute role="health_worker">
            <HealthWorkerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/worker"
        element={
          <ProtectedRoute role="health_worker">
            <HealthWorkerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={<Navigate to="/worker" replace />}
      />
      <Route
        path="/app/dashboard"
        element={<Navigate to="/app/worker" replace />}
      />
      <Route
        path="/app/register"
        element={
          <ProtectedRoute>
            <HealthWorkerRegister />
          </ProtectedRoute>
        }
      />
      <Route
        path="/register"
        element={
          <ProtectedRoute>
            <HealthWorkerRegister />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/admin"
        element={
          <ProtectedRoute role="admin">
            <AdminZone />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute role="admin">
            <AdminZone />
          </ProtectedRoute>
        }
      />
      <Route path="/app/demo" element={<DemoFlow />} />
      <Route path="/demo" element={<DemoFlow />} />
      <Route path="/status/:token" element={<FamilyStatus />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  )
}
