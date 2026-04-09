import { type CSSProperties, type FormEvent, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import {
  getAdminHealthWorkers,
  getAdminPatients,
  getAdminVolunteers,
  postAdminInviteHealthWorker,
  postRegisterHospital,
  postRegisterPatient,
  postRegisterVolunteer,
} from '@/services/api'
import { fadeUpVariants, useScrollReveal } from '@/landing/hooks/useScrollReveal'

type SubmitState = { loading: boolean; message: string; error: boolean }
const ROLE_TARGETS = {
  patient: 'role-card-patient',
  volunteer: 'role-card-volunteer',
  hospital: 'role-card-hospital',
  worker: 'role-card-worker',
  admin: 'role-card-admin',
  family: 'role-card-family',
} as const

function initialState(): SubmitState {
  return { loading: false, message: '', error: false }
}

function cardTitleStyle(): CSSProperties {
  return {
    fontFamily: 'var(--font-display)',
    fontSize: 'var(--text-2xl)',
    fontWeight: 700,
    margin: '0 0 10px',
    color: 'var(--color-charcoal)',
    lineHeight: 1.2,
  }
}

function bodyStyle(): CSSProperties {
  return {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-warm-gray)',
    lineHeight: 1.55,
    margin: '0 0 16px',
  }
}

function inputStyle(): CSSProperties {
  return {
    width: '100%',
    border: '1px solid var(--color-sand-dark)',
    borderRadius: 8,
    background: 'var(--color-white)',
    padding: '10px 12px',
    fontSize: 'var(--text-sm)',
    fontFamily: 'var(--font-body)',
    color: 'var(--color-charcoal)',
  }
}

function labelStyle(): CSSProperties {
  return {
    display: 'block',
    marginBottom: 6,
    fontSize: 'var(--text-xs)',
    color: 'var(--color-muted)',
    fontFamily: 'var(--font-body)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  }
}

export function RoleAccessHub() {
  const { ref, inView } = useScrollReveal(0.12)
  const { role, user } = useAuth()

  const [volunteer, setVolunteer] = useState({
    name: '',
    phone: '',
    lat: '',
    lng: '',
    skills: '',
    vehicle: 'none' as 'none' | 'motorcycle' | 'car' | 'ambulance',
    maxRadius: '5',
  })
  const [patient, setPatient] = useState({
    name: '',
    phone: '',
    lat: '',
    lng: '',
    weeks: '',
    blood: '',
    language: 'en',
    riskFlags: '',
  })
  const [hospital, setHospital] = useState({
    name: '',
    type: 'PHC',
    lat: '',
    lng: '',
    phoneMain: '',
    services: '',
  })
  const [workerInvite, setWorkerInvite] = useState({ name: '', email: '', phone: '' })
  const [familyToken, setFamilyToken] = useState('')

  const [volState, setVolState] = useState<SubmitState>(initialState)
  const [patientState, setPatientState] = useState<SubmitState>(initialState)
  const [hospitalState, setHospitalState] = useState<SubmitState>(initialState)
  const [workerState, setWorkerState] = useState<SubmitState>(initialState)

  const [localityCounts, setLocalityCounts] = useState<{
    patients: number
    volunteers: number
    workers: number
  } | null>(null)

  useEffect(() => {
    if (role !== 'admin' || !user) {
      return
    }
    let active = true
    void Promise.all([getAdminPatients(), getAdminVolunteers(), getAdminHealthWorkers()])
      .then(([patients, volunteers, workers]) => {
        if (!active) return
        setLocalityCounts({ patients: patients.length, volunteers: volunteers.length, workers: workers.length })
      })
      .catch(() => {
        if (!active) return
        setLocalityCounts({ patients: 0, volunteers: 0, workers: 0 })
      })
    return () => {
      active = false
    }
  }, [role, user])

  const submitVolunteer = async (e: FormEvent) => {
    e.preventDefault()
    setVolState({ loading: true, message: '', error: false })
    try {
      const out = await postRegisterVolunteer({
        name: volunteer.name,
        phone: volunteer.phone,
        lat: Number(volunteer.lat),
        lng: Number(volunteer.lng),
        skills: volunteer.skills
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        vehicle: volunteer.vehicle,
        max_radius_km: Number(volunteer.maxRadius),
      })
      setVolState({ loading: false, message: `Volunteer registered (ID: ${out.id}).`, error: false })
    } catch (err) {
      setVolState({ loading: false, message: err instanceof Error ? err.message : 'Failed', error: true })
    }
  }

  const submitPatient = async (e: FormEvent) => {
    e.preventDefault()
    setPatientState({ loading: true, message: '', error: false })
    try {
      const out = await postRegisterPatient({
        name: patient.name,
        phone_primary: patient.phone,
        lat: Number(patient.lat),
        lng: Number(patient.lng),
        weeks_pregnant: patient.weeks ? Number(patient.weeks) : null,
        blood_type: patient.blood || null,
        language: patient.language || 'en',
        risk_flags: patient.riskFlags
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      })
      setPatientState({ loading: false, message: `Patient registered (ID: ${out.id}).`, error: false })
    } catch (err) {
      setPatientState({ loading: false, message: err instanceof Error ? err.message : 'Failed', error: true })
    }
  }

  const submitHospital = async (e: FormEvent) => {
    e.preventDefault()
    setHospitalState({ loading: true, message: '', error: false })
    try {
      const out = await postRegisterHospital({
        name: hospital.name,
        type: hospital.type,
        lat: Number(hospital.lat),
        lng: Number(hospital.lng),
        phone_main: hospital.phoneMain || null,
        services: hospital.services
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      })
      setHospitalState({ loading: false, message: `Hospital registered (ID: ${out.id}).`, error: false })
    } catch (err) {
      setHospitalState({ loading: false, message: err instanceof Error ? err.message : 'Failed', error: true })
    }
  }

  const submitWorker = async (e: FormEvent) => {
    e.preventDefault()
    setWorkerState({ loading: true, message: '', error: false })
    try {
      await postAdminInviteHealthWorker(workerInvite)
      setWorkerState({ loading: false, message: 'Health worker invited to your zone.', error: false })
    } catch (err) {
      setWorkerState({ loading: false, message: err instanceof Error ? err.message : 'Failed', error: true })
    }
  }

  const statusColor = (s: SubmitState) => (s.error ? 'var(--color-alert)' : 'var(--color-forest)')
  type RoleKey = keyof typeof ROLE_TARGETS
  const roleEntries = useMemo(() => Object.entries(ROLE_TARGETS) as [RoleKey, string][], [])
  const [activeRole, setActiveRole] = useState<RoleKey>('patient')

  const jumpToRole = (key: RoleKey) => {
    setActiveRole(key)
    document.getElementById(ROLE_TARGETS[key])?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (visible[0]?.target?.id) {
          const id = visible[0].target.id
          const found = roleEntries.find(([, targetId]) => targetId === id)
          if (found) {
            setActiveRole(found[0])
          }
        }
      },
      {
        threshold: [0.25, 0.5, 0.75],
        rootMargin: '-100px 0px -40% 0px',
      },
    )

    for (const [, id] of roleEntries) {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [roleEntries])

  return (
    <section
      className="landing-section"
      style={{ background: 'var(--color-cream)', borderTop: '1px solid var(--color-sand-dark)' }}
    >
      <div className="landing-container">
        <motion.div ref={ref} initial="hidden" animate={inView ? 'visible' : 'hidden'} variants={fadeUpVariants}>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4vw, var(--text-5xl))',
              fontWeight: 700,
              color: 'var(--color-charcoal)',
              textAlign: 'center',
              margin: '0 0 16px',
              lineHeight: 1.15,
            }}
          >
            Who uses MamaAlert.
            <br />
            Enter details by role.
          </h2>
          <p
            style={{
              textAlign: 'center',
              maxWidth: 740,
              margin: '0 auto 36px',
              color: 'var(--color-warm-gray)',
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-base)',
              lineHeight: 1.6,
            }}
          >
            Public roles can be entered directly here: patient, volunteer, hospital, and worker. Admin remains a
            separate zone-governance role with locality visibility.
          </p>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: 10,
              marginBottom: 24,
            }}
          >
            <button
              type="button"
              className={`landing-btn ${activeRole === 'patient' ? 'landing-btn--terra' : 'landing-btn--ghost'}`}
              onClick={() => jumpToRole('patient')}
            >
              Patient
            </button>
            <button
              type="button"
              className={`landing-btn ${activeRole === 'volunteer' ? 'landing-btn--terra' : 'landing-btn--ghost'}`}
              onClick={() => jumpToRole('volunteer')}
            >
              Volunteer
            </button>
            <button
              type="button"
              className={`landing-btn ${activeRole === 'hospital' ? 'landing-btn--terra' : 'landing-btn--ghost'}`}
              onClick={() => jumpToRole('hospital')}
            >
              Hospital
            </button>
            <button
              type="button"
              className={`landing-btn ${activeRole === 'worker' ? 'landing-btn--terra' : 'landing-btn--ghost'}`}
              onClick={() => jumpToRole('worker')}
            >
              Worker
            </button>
            <button
              type="button"
              className={`landing-btn ${activeRole === 'admin' ? 'landing-btn--terra' : 'landing-btn--ghost'}`}
              onClick={() => jumpToRole('admin')}
            >
              Admin
            </button>
            <button
              type="button"
              className={`landing-btn ${activeRole === 'family' ? 'landing-btn--terra' : 'landing-btn--ghost'}`}
              onClick={() => jumpToRole('family')}
            >
              Family
            </button>
          </div>
        </motion.div>

        <div className="landing-role-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}>
          <article id="role-card-patient" className="landing-card" style={{ padding: 24, scrollMarginTop: 110 }}>
            <h3 style={cardTitleStyle()}>Patient</h3>
            <p style={bodyStyle()}>
              <strong>Responsibility:</strong> Trigger SOS quickly. <br />
              <strong>Receives:</strong> Confirmed help + family status link. <br />
              <strong>Action:</strong> Register profile details for faster response.
            </p>
            <form onSubmit={(e) => void submitPatient(e)} style={{ display: 'grid', gap: 10 }}>
              <div>
                <label style={labelStyle()}>Name</label>
                <input
                  required
                  value={patient.name}
                  onChange={(e) => setPatient({ ...patient, name: e.target.value })}
                  style={inputStyle()}
                />
              </div>
              <div>
                <label style={labelStyle()}>Phone</label>
                <input
                  required
                  value={patient.phone}
                  onChange={(e) => setPatient({ ...patient, phone: e.target.value })}
                  style={inputStyle()}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={labelStyle()}>Latitude</label>
                  <input
                    required
                    value={patient.lat}
                    onChange={(e) => setPatient({ ...patient, lat: e.target.value })}
                    style={inputStyle()}
                  />
                </div>
                <div>
                  <label style={labelStyle()}>Longitude</label>
                  <input
                    required
                    value={patient.lng}
                    onChange={(e) => setPatient({ ...patient, lng: e.target.value })}
                    style={inputStyle()}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={labelStyle()}>Weeks pregnant</label>
                  <input
                    value={patient.weeks}
                    onChange={(e) => setPatient({ ...patient, weeks: e.target.value })}
                    style={inputStyle()}
                  />
                </div>
                <div>
                  <label style={labelStyle()}>Blood type</label>
                  <input
                    value={patient.blood}
                    onChange={(e) => setPatient({ ...patient, blood: e.target.value })}
                    style={inputStyle()}
                  />
                </div>
              </div>
              <div>
                <label style={labelStyle()}>Risk flags (comma separated)</label>
                <input
                  value={patient.riskFlags}
                  onChange={(e) => setPatient({ ...patient, riskFlags: e.target.value })}
                  style={inputStyle()}
                />
              </div>
              <button type="submit" disabled={patientState.loading} className="landing-btn landing-btn--terra">
                {patientState.loading ? 'Submitting…' : 'Register patient'}
              </button>
              {patientState.message ? (
                <p style={{ margin: 0, color: statusColor(patientState), fontSize: 'var(--text-sm)' }}>
                  {patientState.message}
                </p>
              ) : null}
            </form>
          </article>

          <article id="role-card-volunteer" className="landing-card" style={{ padding: 24, scrollMarginTop: 110 }}>
            <h3 style={cardTitleStyle()}>Volunteer</h3>
            <p style={bodyStyle()}>
              <strong>Responsibility:</strong> Reply YES and transport/support. <br />
              <strong>Receives:</strong> SMS alert + patient landmark. <br />
              <strong>Action:</strong> Register for rapid dispatch.
            </p>
            <form onSubmit={(e) => void submitVolunteer(e)} style={{ display: 'grid', gap: 10 }}>
              <div>
                <label style={labelStyle()}>Name</label>
                <input
                  required
                  value={volunteer.name}
                  onChange={(e) => setVolunteer({ ...volunteer, name: e.target.value })}
                  style={inputStyle()}
                />
              </div>
              <div>
                <label style={labelStyle()}>Phone</label>
                <input
                  required
                  value={volunteer.phone}
                  onChange={(e) => setVolunteer({ ...volunteer, phone: e.target.value })}
                  style={inputStyle()}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={labelStyle()}>Latitude</label>
                  <input
                    required
                    value={volunteer.lat}
                    onChange={(e) => setVolunteer({ ...volunteer, lat: e.target.value })}
                    style={inputStyle()}
                  />
                </div>
                <div>
                  <label style={labelStyle()}>Longitude</label>
                  <input
                    required
                    value={volunteer.lng}
                    onChange={(e) => setVolunteer({ ...volunteer, lng: e.target.value })}
                    style={inputStyle()}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={labelStyle()}>Vehicle</label>
                  <select
                    value={volunteer.vehicle}
                    onChange={(e) => setVolunteer({ ...volunteer, vehicle: e.target.value as typeof volunteer.vehicle })}
                    style={inputStyle()}
                  >
                    <option value="none">none</option>
                    <option value="motorcycle">motorcycle</option>
                    <option value="car">car</option>
                    <option value="ambulance">ambulance</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle()}>Max radius (km)</label>
                  <input
                    value={volunteer.maxRadius}
                    onChange={(e) => setVolunteer({ ...volunteer, maxRadius: e.target.value })}
                    style={inputStyle()}
                  />
                </div>
              </div>
              <div>
                <label style={labelStyle()}>Skills (comma separated)</label>
                <input
                  value={volunteer.skills}
                  onChange={(e) => setVolunteer({ ...volunteer, skills: e.target.value })}
                  style={inputStyle()}
                />
              </div>
              <button type="submit" disabled={volState.loading} className="landing-btn landing-btn--terra">
                {volState.loading ? 'Submitting…' : 'Register volunteer'}
              </button>
              {volState.message ? (
                <p style={{ margin: 0, color: statusColor(volState), fontSize: 'var(--text-sm)' }}>{volState.message}</p>
              ) : null}
            </form>
          </article>

          <article id="role-card-hospital" className="landing-card" style={{ padding: 24, scrollMarginTop: 110 }}>
            <h3 style={cardTitleStyle()}>Hospital / Clinic</h3>
            <p style={bodyStyle()}>
              <strong>Responsibility:</strong> Prepare before arrival. <br />
              <strong>Receives:</strong> Pre-alert with risk + ETA. <br />
              <strong>Action:</strong> Register facility details for routing.
            </p>
            <form onSubmit={(e) => void submitHospital(e)} style={{ display: 'grid', gap: 10 }}>
              <div>
                <label style={labelStyle()}>Facility name</label>
                <input
                  required
                  value={hospital.name}
                  onChange={(e) => setHospital({ ...hospital, name: e.target.value })}
                  style={inputStyle()}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={labelStyle()}>Type</label>
                  <input
                    value={hospital.type}
                    onChange={(e) => setHospital({ ...hospital, type: e.target.value })}
                    style={inputStyle()}
                  />
                </div>
                <div>
                  <label style={labelStyle()}>Phone main</label>
                  <input
                    value={hospital.phoneMain}
                    onChange={(e) => setHospital({ ...hospital, phoneMain: e.target.value })}
                    style={inputStyle()}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={labelStyle()}>Latitude</label>
                  <input
                    required
                    value={hospital.lat}
                    onChange={(e) => setHospital({ ...hospital, lat: e.target.value })}
                    style={inputStyle()}
                  />
                </div>
                <div>
                  <label style={labelStyle()}>Longitude</label>
                  <input
                    required
                    value={hospital.lng}
                    onChange={(e) => setHospital({ ...hospital, lng: e.target.value })}
                    style={inputStyle()}
                  />
                </div>
              </div>
              <div>
                <label style={labelStyle()}>Services (comma separated)</label>
                <input
                  value={hospital.services}
                  onChange={(e) => setHospital({ ...hospital, services: e.target.value })}
                  style={inputStyle()}
                />
              </div>
              <button type="submit" disabled={hospitalState.loading} className="landing-btn landing-btn--terra">
                {hospitalState.loading ? 'Submitting…' : 'Register hospital'}
              </button>
              {hospitalState.message ? (
                <p style={{ margin: 0, color: statusColor(hospitalState), fontSize: 'var(--text-sm)' }}>
                  {hospitalState.message}
                </p>
              ) : null}
            </form>
          </article>

          <article id="role-card-worker" className="landing-card" style={{ padding: 24, scrollMarginTop: 110 }}>
            <h3 style={cardTitleStyle()}>Health Worker</h3>
            <p style={bodyStyle()}>
              <strong>Responsibility:</strong> Own patient registry and follow-up. <br />
              <strong>Receives:</strong> Worker dashboard with patients and volunteer network. <br />
              <strong>Action:</strong> Sign in with your assigned account to manage patients.
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Link to="/app/worker" className="landing-btn landing-btn--terra">
                Open worker dashboard
              </Link>
              <Link to="/app/register" className="landing-btn landing-btn--ghost">
                Register patient
              </Link>
            </div>
            <p style={{ ...bodyStyle(), marginTop: 12, marginBottom: 0 }}>
              Need worker access? Contact your zone admin to be invited.
            </p>
          </article>

          {role === 'admin' ? (
            <article id="role-card-admin" className="landing-card" style={{ padding: 24, scrollMarginTop: 110 }}>
              <h3 style={cardTitleStyle()}>Admin (Zone Governance)</h3>
              <p style={bodyStyle()}>
                <strong>Responsibility:</strong> Govern one locality zone. <br />
                <strong>Receives:</strong> Zone-level maps, role counts, and escalation controls. <br />
                <strong>Action:</strong> Invite workers and audit locality role coverage.
              </p>
              <form onSubmit={(e) => void submitWorker(e)} style={{ display: 'grid', gap: 10 }}>
                <div>
                  <label style={labelStyle()}>Worker name</label>
                  <input
                    required
                    value={workerInvite.name}
                    onChange={(e) => setWorkerInvite({ ...workerInvite, name: e.target.value })}
                    style={inputStyle()}
                  />
                </div>
                <div>
                  <label style={labelStyle()}>Worker email</label>
                  <input
                    required
                    value={workerInvite.email}
                    onChange={(e) => setWorkerInvite({ ...workerInvite, email: e.target.value })}
                    style={inputStyle()}
                  />
                </div>
                <div>
                  <label style={labelStyle()}>Phone (optional)</label>
                  <input
                    value={workerInvite.phone}
                    onChange={(e) => setWorkerInvite({ ...workerInvite, phone: e.target.value })}
                    style={inputStyle()}
                  />
                </div>
                <button type="submit" disabled={workerState.loading} className="landing-btn landing-btn--terra">
                  {workerState.loading ? 'Submitting…' : 'Invite health worker'}
                </button>
                {workerState.message ? (
                  <p style={{ margin: 0, color: statusColor(workerState), fontSize: 'var(--text-sm)' }}>
                    {workerState.message}
                  </p>
                ) : null}
              </form>
              <div style={{ marginTop: 18, borderTop: '1px solid var(--color-sand-dark)', paddingTop: 14 }}>
                <p style={{ ...bodyStyle(), marginBottom: 8 }}>
                  <strong>Locality privacy:</strong> role-level locality data is shown only to admins signed in to their
                  zone.
                </p>
                {localityCounts ? (
                  <p style={{ margin: 0, color: 'var(--color-forest)', fontSize: 'var(--text-sm)', fontFamily: 'var(--font-body)' }}>
                    Your zone snapshot: {localityCounts.patients} patients, {localityCounts.volunteers} volunteers,{' '}
                    {localityCounts.workers} health workers.
                  </p>
                ) : (
                  <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: 'var(--text-sm)', fontFamily: 'var(--font-body)' }}>
                    Loading zone snapshot...
                  </p>
                )}
              </div>
            </article>
          ) : (
            <article id="role-card-admin" className="landing-card" style={{ padding: 24, scrollMarginTop: 110 }}>
              <h3 style={cardTitleStyle()}>Admin (Zone Governance)</h3>
              <p style={bodyStyle()}>
                <strong>Admin is not a public responder role.</strong> It is assigned to NGO/zone coordinators for
                locality governance, role audits, and escalation controls.
              </p>
              <p style={{ ...bodyStyle(), marginBottom: 8 }}>
                Sign in with an existing admin account to access zone controls.
              </p>
              <Link to="/app/admin" className="landing-btn landing-btn--ghost">
                Open admin dashboard
              </Link>
          </article>
          )}

          <article
            id="role-card-family"
            className="landing-card"
            style={{ padding: 24, gridColumn: '1 / -1', scrollMarginTop: 110 }}
          >
            <h3 style={cardTitleStyle()}>Family / Caregiver</h3>
            <p style={bodyStyle()}>
              <strong>Responsibility:</strong> Stay informed and ready to support. <br />
              <strong>Receives:</strong> Live status updates with no login. <br />
              <strong>Action:</strong> Enter status token to track current emergency.
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <input
                value={familyToken}
                onChange={(e) => setFamilyToken(e.target.value)}
                placeholder="Enter family status token"
                style={{ ...inputStyle(), flex: 1, minWidth: 220 }}
              />
              <Link
                to={familyToken.trim() ? `/status/${encodeURIComponent(familyToken.trim())}` : '#'}
                className="landing-btn landing-btn--ghost"
                aria-label="Open family status tracker"
                style={{ minHeight: 44 }}
              >
                Track family status
              </Link>
            </div>
          </article>
        </div>
      </div>

      <style>{`
        @media (max-width: 991px) {
          .landing-role-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  )
}
