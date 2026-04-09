import { Navigate, Route, Routes } from 'react-router-dom'
import { LandingPage } from '@/landing/LandingPage'
import { AdminZone } from '@/views/AdminZone'
import { DemoFlow } from '@/views/DemoFlow'
import { FamilyStatus } from '@/views/FamilyStatus'
import { HealthWorkerDashboard } from '@/views/HealthWorkerDashboard'
import { HealthWorkerRegister } from '@/views/HealthWorkerRegister'
import { HospitalInbox } from '@/views/HospitalInbox'
import { PatientSOS } from '@/views/PatientSOS'
import { VolunteerDashboard } from '@/views/VolunteerDashboard'
import { ProtectedRoute } from '@/components/ProtectedRoute'

export function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />

      <Route path="/app" element={<PatientSOS />} />
      <Route path="/app/volunteer" element={<VolunteerDashboard />} />
      <Route path="/app/hospital" element={<HospitalInbox />} />
      <Route path="/volunteer" element={<VolunteerDashboard />} />
      <Route path="/hospital" element={<HospitalInbox />} />
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
  )
}
