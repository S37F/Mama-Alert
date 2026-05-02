import { useEffect, useMemo, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Building2, HeartPulse, Link2, Radio, Shield, Stethoscope } from 'lucide-react'
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

const ROLE_TAB_LABEL: Record<RoleKey, string> = {
  patient: 'Patient',
  volunteer: 'Volunteer',
  hospital: 'Hospital',
  worker: 'Worker',
  family: 'Family',
  admin: 'Admin',
}

type CardAction = { to: string; label: string; variant: 'terra' | 'ghost' }

type RoleCardDef = {
  roleKey: RoleKey
  title: string
  badge: string
  Icon: LucideIcon
  body: string
  actions?: CardAction[]
  pathHint?: string
}

function buildRoleCards(): RoleCardDef[] {
  return [
  {
    roleKey: 'patient',
    title: 'Patient SOS',
    badge: 'Phone access',
    Icon: HeartPulse,
    body: 'One tap raises an alert with location so responders and facilities can act immediately—no password. Sign in with your phone (SMS code), self-register where your program allows it, or open the private link from your health worker.',
    actions: [
      { to: '/sos', label: 'Open SOS', variant: 'terra' },
      { to: '/sos/register', label: 'Register myself', variant: 'ghost' },
    ],
    pathHint: '/sos/register',
  },
  {
    roleKey: 'volunteer',
    title: 'Community volunteer',
    badge: 'Phone ID',
    Icon: Radio,
    body: 'A live feed of nearby maternal emergencies. Tap YES or NO to respond; when you are needed, directions land on your phone.',
    actions: [{ to: '/signup?role=volunteer', label: 'Join as volunteer', variant: 'terra' }],
    pathHint: '/volunteer',
  },
  {
    roleKey: 'hospital',
    title: 'Hospital inbox',
    badge: 'Facility access',
    Icon: Building2,
    body:
      'Receive maternity pre-alert SMS with patient summary, blood type, and ETA. Reply ARRIVED when the patient arrives to close the alert—no web app required.',
    actions: [{ to: '/hospital', label: 'Open hospital inbox', variant: 'terra' }],
    pathHint: 'SMS pre-alert / reply ARRIVED',
  },
  {
    roleKey: 'worker',
    title: 'Health worker',
    badge: 'Staff sign-in',
    Icon: Stethoscope,
    body: 'Onboard women into the program, keep records straight, and run follow-ups from the worker dashboard.',
    actions: [{ to: '/signup?role=health_worker', label: 'Open worker portal', variant: 'terra' }],
    pathHint: '/register',
  },
  {
    roleKey: 'family',
    title: 'Family updates',
    badge: 'SMS link',
    Icon: Link2,
    body: 'During an active alert, trusted contacts get a read-only status link by text—no app install, no editing, just clarity.',
    pathHint: 'URL pattern: /status/:token',
  },
  {
    roleKey: 'admin',
    title: 'Zone administration',
    badge: 'Restricted',
    Icon: Shield,
    body: 'NGO zone leads manage volunteers, hospitals, and locality rules so the right people see the right alerts.',
    actions: [{ to: '/signup?role=admin', label: 'Open admin console', variant: 'terra' }],
    pathHint: '/admin',
  },
]
}

export function RoleAccessHub() {
  const { ref, inView } = useScrollReveal(0.12)
  const roleCards = useMemo(() => buildRoleCards(), [])
  const roleEntries = useMemo(() => Object.entries(ROLE_TARGETS) as [RoleKey, string][], [])
  const [activeRole, setActiveRole] = useState<RoleKey>('patient')

  const jumpToRole = (key: RoleKey) => {
    setActiveRole(key)
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document.getElementById(ROLE_TARGETS[key])?.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'start',
    })
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
      className="landing-section landing-role-access"
      style={{ background: 'var(--color-cream)', borderTop: '1px solid var(--color-sand-dark)' }}
    >
      <div className="landing-container">
        <motion.div ref={ref} initial="hidden" animate={inView ? 'visible' : 'hidden'} variants={fadeUpVariants}>
          <p className="landing-role-access-eyebrow">How the product is organized</p>
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
            Each role opens its own screen
          </h2>
          <p
            style={{
              textAlign: 'center',
              maxWidth: 640,
              margin: '0 auto 28px',
              color: 'var(--color-warm-gray)',
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-lg)',
              lineHeight: 1.65,
            }}
          >
            This page explains the system. The links below jump straight into the live routes—same URLs responders bookmark in
            the field.
          </p>
          <div className="landing-role-access-tabs" aria-label="Role shortcuts">
            {roleEntries.map(([key]) => (
              <button
                key={key}
                type="button"
                aria-controls={ROLE_TARGETS[key]}
                aria-pressed={activeRole === key}
                className={`landing-role-access-tab ${activeRole === key ? 'landing-role-access-tab--active' : ''}`}
                onClick={() => jumpToRole(key)}
              >
                {ROLE_TAB_LABEL[key]}
              </button>
            ))}
          </div>
        </motion.div>

        <div className="landing-role-access-grid">
          {roleCards.map(({ roleKey, title, badge, Icon, body, actions, pathHint }) => (
            <article
              key={roleKey}
              id={ROLE_TARGETS[roleKey]}
              className="landing-card landing-role-access-card"
              style={{ scrollMarginTop: 110 }}
            >
              <div className="landing-role-access-card-head">
                <div className="landing-role-access-icon" aria-hidden>
                  <Icon size={22} strokeWidth={1.75} />
                </div>
                <div className="landing-role-access-card-titles">
                  <span className="landing-role-access-badge">{badge}</span>
                  <h3 style={{ fontFamily: 'var(--font-display)', margin: '6px 0 0', fontSize: 'var(--text-xl)' }}>
                    {title}
                  </h3>
                </div>
              </div>
              <p className="landing-role-access-body">{body}</p>
              <div className="landing-role-access-spacer" />
              {actions && actions.length > 0 ? (
                <div className="landing-role-access-actions">
                  {actions.map((a) => (
                    <Link
                      key={a.to}
                      to={a.to}
                      className={`landing-btn ${a.variant === 'terra' ? 'landing-btn--terra' : 'landing-btn--ghost'}`}
                    >
                      {a.label}
                    </Link>
                  ))}
                </div>
              ) : null}
              {pathHint ? (
                <p className="landing-role-access-path" title={pathHint}>
                  {pathHint}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      </div>
      <style>{`
        .landing-role-access-eyebrow {
          text-align: center;
          margin: 0 0 12px;
          font-family: var(--font-body);
          font-size: var(--text-sm);
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--color-terra);
        }
        .landing-role-access-tabs {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 6px;
          padding: 8px;
          max-width: max-content;
          margin: 0 auto 36px;
          background: var(--color-sand);
          border: 1px solid var(--color-sand-dark);
          border-radius: 999px;
        }
        .landing-role-access-tab {
          font-family: var(--font-body);
          font-size: var(--text-sm);
          font-weight: 600;
          padding: 10px 18px;
          border-radius: 999px;
          border: 1px solid transparent;
          background: transparent;
          color: var(--color-charcoal);
          cursor: pointer;
          transition:
            background-color 0.2s ease,
            color 0.2s ease,
            border-color 0.2s ease,
            box-shadow 0.2s ease;
        }
        .landing-role-access-tab:hover {
          background: rgba(255, 255, 255, 0.55);
        }
        .landing-role-access-tab:focus-visible {
          outline: 3px solid var(--color-terra);
          outline-offset: 2px;
        }
        .landing-role-access-tab--active {
          background: var(--color-terra);
          color: var(--color-white);
          border-color: var(--color-terra);
          box-shadow: 0 4px 14px rgba(196, 82, 42, 0.28);
        }
        .landing-role-access-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 22px;
          align-items: stretch;
        }
        .landing-role-access-card {
          padding: 22px 22px 20px;
          display: flex;
          flex-direction: column;
          min-height: 100%;
          transition:
            border-color 0.2s ease,
            box-shadow 0.2s ease;
        }
        .landing-role-access-card:hover {
          border-color: rgba(196, 82, 42, 0.35);
          box-shadow: 0 14px 36px rgba(44, 36, 22, 0.07);
        }
        .landing-role-access-card-head {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          margin-bottom: 12px;
        }
        .landing-role-access-icon {
          flex-shrink: 0;
          width: 46px;
          height: 46px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(145deg, var(--color-sand) 0%, rgba(255, 248, 242, 0.9) 100%);
          border: 1px solid var(--color-sand-dark);
          color: var(--color-terra);
        }
        .landing-role-access-card-titles {
          min-width: 0;
        }
        .landing-role-access-badge {
          display: inline-block;
          font-family: var(--font-body);
          font-size: var(--text-xs);
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--color-terra-dark);
          background: rgba(196, 82, 42, 0.1);
          padding: 4px 10px;
          border-radius: 999px;
        }
        .landing-role-access-body {
          margin: 0;
          color: var(--color-warm-gray);
          font-family: var(--font-body);
          font-size: var(--text-base);
          line-height: 1.65;
        }
        .landing-role-access-spacer {
          flex: 1;
          min-height: 16px;
        }
        .landing-role-access-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        .landing-role-access-path {
          margin: 12px 0 0;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
          font-size: var(--text-xs);
          color: var(--color-muted);
          line-height: 1.5;
          word-break: break-word;
        }
        @media (max-width: 991px) {
          .landing-role-access-grid {
            grid-template-columns: 1fr !important;
          }
          .landing-role-access-tabs {
            max-width: 100%;
            justify-content: flex-start;
            overflow-x: auto;
            flex-wrap: nowrap;
            border-radius: 16px;
            scrollbar-width: thin;
            -webkit-overflow-scrolling: touch;
          }
          .landing-role-access-tab {
            flex: 0 0 auto;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .landing-role-access-tab,
          .landing-role-access-card {
            transition: none;
          }
        }
      `}</style>
    </section>
  )
}
