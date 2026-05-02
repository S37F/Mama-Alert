import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { fadeUpVariants, useScrollReveal } from '@/landing/hooks/useScrollReveal'

function IconHourglass() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden>
      <path
        d="M14 8h20v4l-6 8 6 8v4H14v-4l6-8-6-8V8z"
        stroke="var(--color-terra)"
        strokeWidth="2.2"
        strokeLinejoin="round"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M18 22h12M20 26h8"
        stroke="var(--color-terra)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconRoad() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden>
      <path
        d="M8 36c8-4 12-14 16-24 4 10 8 20 16 24"
        stroke="var(--color-terra)"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M22 20h4M21 24h6M20 28h8"
        stroke="var(--color-terra)"
        strokeWidth="1.2"
        strokeDasharray="2 3"
      />
    </svg>
  )
}

function IconDoor() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden>
      <rect x="12" y="10" width="24" height="30" rx="2" stroke="var(--color-terra)" strokeWidth="2.2" />
      <path d="M28 22v8" stroke="var(--color-terra)" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 14l-4-2M32 14l4-2" stroke="var(--color-terra)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

interface DelayItem {
  id: string
  icon: ReactNode
  title: string
  body: string
  duration: string
}

const DELAYS: [DelayItem, DelayItem, DelayItem] = [
  {
    id: 'delay-1',
    icon: <IconHourglass />,
    title: 'She waits. Her family waits.',
    body: "The danger signs aren't recognized. Hours pass. Cultural norms, fear, uncertainty — all conspiring against the minutes she doesn't have.",
    duration: 'Average: 2–6 hours lost',
  },
  {
    id: 'delay-2',
    icon: <IconRoad />,
    title: 'No car. No road. No one awake.',
    body: 'Many emergencies become fatal before skilled care is reached. MamaAlert focuses on the minutes lost to transport, distance, and late mobilization.',
    duration: 'Average: 1.5–3 hours lost',
  },
  {
    id: 'delay-3',
    icon: <IconDoor />,
    title: "The facility isn't ready.",
    body: "She arrives. But the staff didn't know she was coming. No blood prepared. No operating room cleared. Minutes become fatal.",
    duration: 'Average: 45 min–2 hours lost',
  },
]

function DelayCardBody({ icon, title, body, duration }: DelayItem) {
  return (
    <>
      <div style={{ marginBottom: 16 }}>{icon}</div>
      <h3
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-xl)',
          fontWeight: 700,
          color: 'var(--color-charcoal)',
          margin: '0 0 12px',
          lineHeight: 1.25,
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--text-base)',
          color: 'var(--color-warm-gray)',
          lineHeight: 1.65,
          margin: '0 0 16px',
        }}
      >
        {body}
      </p>
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--text-sm)',
          fontWeight: 600,
          color: 'var(--color-terra)',
          margin: 0,
        }}
      >
        {duration}
      </p>
    </>
  )
}

function DelayCardMotion({ item }: { item: DelayItem }) {
  const { ref, inView } = useScrollReveal(0.12)
  return (
    <motion.article
      ref={ref}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={fadeUpVariants}
      className="landing-card"
      style={{ padding: 28, flex: 1, minWidth: 240 }}
    >
      <DelayCardBody {...item} />
    </motion.article>
  )
}

export function ThreeDelays() {
  const { ref: ansRef, inView: ansInView } = useScrollReveal(0.15)
  const [openDelayIds, setOpenDelayIds] = useState<Set<string>>(() => new Set([DELAYS[0]?.id ?? 'delay-1']))

  const setDelayOpen = (id: string, open: boolean) => {
    setOpenDelayIds((current) => {
      const next = new Set(current)
      if (open) next.add(id)
      else next.delete(id)
      return next
    })
  }

  return (
    <section className="landing-section" style={{ background: 'var(--color-cream)' }}>
      <div className="landing-container">
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2rem, 4vw, var(--text-5xl))',
            fontWeight: 700,
            color: 'var(--color-charcoal)',
            textAlign: 'center',
            maxWidth: 640,
            margin: '0 auto 56px',
            lineHeight: 1.15,
          }}
        >
          Why mothers die.
          <br />
          It&apos;s not one thing. It&apos;s three.
        </h2>

        <div className="landing-delays-desktop" style={{ marginBottom: 48 }}>
          <div
            style={{
              display: 'flex',
              flexWrap: 'nowrap',
              gap: 32,
              justifyContent: 'space-between',
              alignItems: 'stretch',
            }}
          >
            <DelayCardMotion item={DELAYS[0]} />
            <div
              aria-hidden
              style={{
                width: 1,
                alignSelf: 'stretch',
                background: 'var(--color-sand-dark)',
              }}
            />
            <DelayCardMotion item={DELAYS[1]} />
            <div
              aria-hidden
              style={{
                width: 1,
                alignSelf: 'stretch',
                background: 'var(--color-sand-dark)',
              }}
            />
            <DelayCardMotion item={DELAYS[2]} />
          </div>
        </div>

        <div className="landing-delays-mobile" style={{ marginBottom: 48 }}>
          {DELAYS.map((item) => (
            <details
              key={item.id}
              className="landing-card landing-delay-details"
              open={openDelayIds.has(item.id)}
              onToggle={(event) => setDelayOpen(item.id, event.currentTarget.open)}
              style={{ padding: 0, marginBottom: 12 }}
            >
              <summary
                style={{
                  padding: '20px 24px',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-display)',
                  fontSize: 'var(--text-lg)',
                  fontWeight: 700,
                  color: 'var(--color-charcoal)',
                  listStyle: 'none',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ display: 'flex', width: 40, justifyContent: 'center' }}>{item.icon}</span>
                    {item.title}
                  </span>
                  <span aria-hidden="true" style={{ color: 'var(--color-terra)', fontFamily: 'var(--font-body)' }}>
                    {openDelayIds.has(item.id) ? '-' : '+'}
                  </span>
                </span>
              </summary>
              <div style={{ padding: '0 24px 24px', borderTop: '1px solid var(--color-sand-dark)' }}>
                <div style={{ paddingTop: 16 }}>
                  <p
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 'var(--text-base)',
                      color: 'var(--color-warm-gray)',
                      lineHeight: 1.65,
                      margin: '0 0 16px',
                    }}
                  >
                    {item.body}
                  </p>
                  <p
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 'var(--text-sm)',
                      fontWeight: 600,
                      color: 'var(--color-terra)',
                      margin: 0,
                    }}
                  >
                    {item.duration}
                  </p>
                </div>
              </div>
            </details>
          ))}
        </div>

        <div
          style={{
            borderTop: '1px solid var(--color-terra)',
            maxWidth: 720,
            margin: '0 auto',
            paddingTop: 40,
          }}
        >
          <motion.p
            ref={ansRef}
            initial="hidden"
            animate={ansInView ? 'visible' : 'hidden'}
            variants={fadeUpVariants}
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.5rem, 3vw, var(--text-4xl))',
              fontWeight: 700,
              color: 'var(--color-charcoal)',
              textAlign: 'center',
              margin: 0,
              lineHeight: 1.3,
            }}
          >
            MamaAlert addresses all three.
            <br />
            Simultaneously. In under 60 seconds.
          </motion.p>
        </div>
      </div>
      <style>{`
        .landing-delays-mobile { display: none; }
        .landing-delays-desktop { display: block; }
        .landing-delay-details summary::-webkit-details-marker { display: none; }
        @media (max-width: 991px) {
          .landing-delays-mobile { display: block; }
          .landing-delays-desktop { display: none; }
        }
      `}</style>
    </section>
  )
}
