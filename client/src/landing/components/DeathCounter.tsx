import { useEffect, useRef, useState } from 'react'

const DEATH_INTERVAL_MS = 121800
const COUNTER_UPDATE_MS = 1000

export function DeathCounter() {
  const startRef = useRef<number | null>(null)
  const [deaths, setDeaths] = useState(0)
  const [progress, setProgress] = useState(0)
  const [flashKey, setFlashKey] = useState(0)
  const prevFloor = useRef(0)

  useEffect(() => {
    startRef.current = Date.now()

    const tick = () => {
      const start = startRef.current ?? Date.now()
      const elapsed = Date.now() - start
      const d = elapsed / DEATH_INTERVAL_MS
      const p = ((elapsed % DEATH_INTERVAL_MS) / DEATH_INTERVAL_MS) * 100

      setDeaths(Number.isFinite(d) ? d : 0)
      setProgress(Number.isFinite(p) ? p : 0)

      const fl = Math.floor(d)
      if (fl > prevFloor.current) {
        prevFloor.current = fl
        setFlashKey((k) => k + 1)
      }
    }

    tick()
    const interval = window.setInterval(tick, COUNTER_UPDATE_MS)
    return () => window.clearInterval(interval)
  }, [])

  const display = Number.isFinite(deaths) ? deaths.toFixed(1) : '0.0'
  const barColor =
    progress > 92 ? 'var(--color-alert)' : progress > 70 ? 'var(--color-terra-light)' : 'var(--color-terra)'

  return (
    <div className="landing-death-counter">
      <div
        className="landing-card landing-death-counter__card"
        style={{
          padding: '28px 24px',
          animation: flashKey ? 'landing-death-flash 0.35s ease-out' : undefined,
        }}
      >
        <p
          className="landing-death-counter__lead"
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-base)',
            color: 'var(--color-warm-gray)',
            lineHeight: 1.5,
            margin: '0 0 20px',
            maxWidth: '280px',
          }}
        >
          Women who have died in childbirth
          <br />
          since you opened this page
        </p>

        <p
          aria-label="Deaths in childbirth since page load"
          className="landing-death-counter__number will-change-transform"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-8xl)',
            fontWeight: 900,
            color: 'var(--color-terra)',
            lineHeight: 1,
            margin: '0 0 16px',
            letterSpacing: 0,
          }}
        >
          {display}
        </p>

        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
          style={{
            height: 6,
            borderRadius: 4,
            background: 'var(--color-sand-dark)',
            overflow: 'hidden',
            marginBottom: 20,
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              background: barColor,
              borderRadius: 4,
              transition: 'width 1s linear, background 0.3s ease',
            }}
          />
        </div>

        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-sm)',
            color: 'var(--color-warm-gray)',
            margin: '0 0 8px',
            lineHeight: 1.5,
          }}
        >
          One death every 2 minutes
          <br />
          260,000 every year · WHO 2023
        </p>

        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-xs)',
            color: 'var(--color-muted)',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'var(--color-terra)',
              flexShrink: 0,
            }}
          />
          Counter started when you arrived
        </p>
      </div>

      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--text-xs)',
          color: 'var(--color-muted)',
          marginTop: 16,
          lineHeight: 1.5,
          maxWidth: 320,
        }}
      >
        Based on{' '}
        <a
          href="https://www.who.int/news-room/fact-sheets/detail/maternal-mortality"
          target="_blank"
          rel="noreferrer"
          style={{ color: 'inherit', textDecoration: 'underline' }}
        >
          WHO 2023 estimates
        </a>
        .
        <br />
        Maternal deaths during pregnancy or within 42 days of termination.
      </p>

      <style>{`
        @keyframes landing-death-flash {
          0% { filter: brightness(1); }
          40% { filter: brightness(1.15); }
          100% { filter: brightness(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes landing-death-flash {
            0%, 100% { filter: none; }
          }
        }
      `}</style>
    </div>
  )
}
