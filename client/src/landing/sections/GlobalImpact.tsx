import { lazy, Suspense, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { WorldMapStatic } from '@/landing/components/WorldMapStatic'
import { fadeUpVariants, useScrollReveal } from '@/landing/hooks/useScrollReveal'

const GlobeCanvas = lazy(() => import('@/landing/components/GlobeCanvas'))

const PILLS = [
  'SMS in 190+ countries',
  'USSD zero-internet',
  'Offline PWA',
  'IVR voice call',
] as const

export function GlobalImpact() {
  const { ref: headRef, inView: headInView } = useScrollReveal(0.12)
  const [narrow, setNarrow] = useState(
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)').matches : false,
  )

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const fn = () => setNarrow(mq.matches)
    mq.addEventListener('change', fn)
    fn()
    return () => mq.removeEventListener('change', fn)
  }, [])

  return (
    <section className="landing-section" style={{ background: 'var(--color-cream)' }}>
      <div className="landing-container">
        <motion.div
          ref={headRef}
          initial="hidden"
          animate={headInView ? 'visible' : 'hidden'}
          variants={fadeUpVariants}
        >
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4vw, var(--text-5xl))',
              fontWeight: 700,
              color: 'var(--color-charcoal)',
              textAlign: 'center',
              margin: '0 0 48px',
              lineHeight: 1.15,
              maxWidth: 720,
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            A network built for the world&apos;s
            <br />
            most unreachable places.
          </h2>
        </motion.div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 3fr',
            gap: 32,
            alignItems: 'center',
            marginBottom: 32,
          }}
          className="landing-globe-grid"
        >
          <div>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-lg)',
                color: 'var(--color-warm-gray)',
                lineHeight: 1.65,
                margin: 0,
              }}
            >
              Works where infrastructure doesn&apos;t.
            </p>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-base)',
                color: 'var(--color-warm-gray)',
                lineHeight: 1.65,
                margin: '16px 0 0',
              }}
            >
              SMS-based alerting works in 190+ countries. USSD works on any phone made since 1998. No internet. No
              app store. No data plan.
            </p>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-base)',
                color: 'var(--color-charcoal)',
                lineHeight: 1.65,
                margin: '16px 0 0',
                fontWeight: 500,
              }}
            >
              Just a community, and a signal.
            </p>
          </div>
          <div style={{ minHeight: 400, position: 'relative' }}>
            <p className="landing-sr-only">
              Globe visualization (decorative): a slowly rotating Earth with a latitude–longitude grid, simplified
              continent coastlines, and pulsing markers over South Asia, West Africa, Nigeria, the Horn of Africa,
              Bangladesh, Myanmar, the Congo basin, Sudan, the Andes, and Oceania — illustrating where community
              alerts can appear. Touch exploration is visual only.
            </p>
            {narrow ? (
              <WorldMapStatic />
            ) : (
              <Suspense
                fallback={
                  <div
                    style={{
                      height: 600,
                      background: 'var(--color-sand)',
                      border: '1px solid var(--color-sand-dark)',
                      borderRadius: 16,
                    }}
                    aria-hidden
                  />
                }
              >
                <GlobeCanvas />
              </Suspense>
            )}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            justifyContent: 'center',
            overflowX: 'auto',
            paddingBottom: 4,
          }}
          className="landing-pill-row"
        >
          {PILLS.map((label) => (
            <span key={label} className="landing-pill" style={{ fontFamily: 'var(--font-body)' }}>
              {label}
            </span>
          ))}
        </div>
      </div>
      <style>{`
        @media (max-width: 991px) {
          .landing-globe-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  )
}
