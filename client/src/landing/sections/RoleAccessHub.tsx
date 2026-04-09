import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { fadeUpVariants, useScrollReveal } from '@/landing/hooks/useScrollReveal'

const ROLE_TARGETS = {
  patient: 'role-card-patient',
  volunteer: 'role-card-volunteer',
  hospital: 'role-card-hospital',
  worker: 'role-card-worker',
  family: 'role-card-family',
  admin: 'role-card-admin',
} as const

type RoleKey = keyof typeof ROLE_TARGETS

export function RoleAccessHub() {
  const { ref, inView } = useScrollReveal(0.12)
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
        const top = visible[0]
        if (!top?.target?.id) return
        const found = roleEntries.find(([, id]) => id === top.target.id)
        if (found) setActiveRole(found[0])
      },
      { threshold: [0.25, 0.5, 0.75], rootMargin: '-100px 0px -40% 0px' },
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
            Role Access
            <br />
            Separate screens by URL
          </h2>
          <p
            style={{
              textAlign: 'center',
              maxWidth: 760,
              margin: '0 auto 28px',
              color: 'var(--color-warm-gray)',
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-base)',
              lineHeight: 1.6,
            }}
          >
            In line with your system docs, landing is informational. Each role uses its own route and screen for action.
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
            {roleEntries.map(([key]) => (
              <button
                key={key}
                type="button"
                className={`landing-btn ${activeRole === key ? 'landing-btn--terra' : 'landing-btn--ghost'}`}
                onClick={() => jumpToRole(key)}
              >
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </button>
            ))}
          </div>
        </motion.div>

        <div className="landing-role-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}>
          <article id="role-card-patient" className="landing-card" style={{ padding: 24, scrollMarginTop: 110 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', marginTop: 0 }}>Patient SOS</h3>
            <p style={{ color: 'var(--color-warm-gray)', lineHeight: 1.6 }}>
              One-tap emergency trigger screen for pregnant women. No login required.
            </p>
            <Link to="/app" className="landing-btn landing-btn--terra">
              Open `/app`
            </Link>
          </article>

          <article id="role-card-volunteer" className="landing-card" style={{ padding: 24, scrollMarginTop: 110 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', marginTop: 0 }}>Volunteer</h3>
            <p style={{ color: 'var(--color-warm-gray)', lineHeight: 1.6 }}>
              Live alert feed + YES/NO response flow for registered community responders.
            </p>
            <Link to="/volunteer" className="landing-btn landing-btn--terra">
              Open `/volunteer`
            </Link>
          </article>

          <article id="role-card-hospital" className="landing-card" style={{ padding: 24, scrollMarginTop: 110 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', marginTop: 0 }}>Hospital</h3>
            <p style={{ color: 'var(--color-warm-gray)', lineHeight: 1.6 }}>
              Pre-alert inbox for incoming maternal emergencies and readiness acknowledgements.
            </p>
            <Link to="/hospital" className="landing-btn landing-btn--terra">
              Open `/hospital`
            </Link>
          </article>

          <article id="role-card-worker" className="landing-card" style={{ padding: 24, scrollMarginTop: 110 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', marginTop: 0 }}>Health Worker</h3>
            <p style={{ color: 'var(--color-warm-gray)', lineHeight: 1.6 }}>
              Patient registration and worker dashboard. Auth required.
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Link to="/register" className="landing-btn landing-btn--ghost">
                Open `/register`
              </Link>
              <Link to="/worker" className="landing-btn landing-btn--terra">
                Open `/worker`
              </Link>
            </div>
          </article>

          <article id="role-card-family" className="landing-card" style={{ padding: 24, scrollMarginTop: 110 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', marginTop: 0 }}>Family</h3>
            <p style={{ color: 'var(--color-warm-gray)', lineHeight: 1.6 }}>
              Token-based read-only status page shared by SMS when an alert is active.
            </p>
            <p style={{ color: 'var(--color-muted)', margin: '8px 0 0', fontSize: 'var(--text-sm)' }}>
              URL pattern: `/status/:token`
            </p>
          </article>

          <article id="role-card-admin" className="landing-card" style={{ padding: 24, scrollMarginTop: 110 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', marginTop: 0 }}>Admin (Zone)</h3>
            <p style={{ color: 'var(--color-warm-gray)', lineHeight: 1.6 }}>
              NGO zone governance dashboard. Locality visibility and controls are restricted to admin role.
            </p>
            <Link to="/admin" className="landing-btn landing-btn--terra">
              Open `/admin`
            </Link>
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
