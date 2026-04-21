import { Link } from 'react-router-dom'
import { DeathCounter } from '@/landing/components/DeathCounter'
import { usePWAInstall } from '@/landing/hooks/usePWAInstall'

export function Hero() {
  const { install, isInstalled, isInstalling, canInstall } = usePWAInstall()
  const installLabel = isInstalled ? 'Open App' : canInstall ? 'Install MamaAlert' : 'Open App'

  return (
    <section
      id="top"
      className="landing-grain"
      style={{
        minHeight: '100svh',
        display: 'flex',
        alignItems: 'center',
        paddingTop: 96,
        paddingBottom: 64,
      }}
    >
      <div className="landing-container" style={{ width: '100%' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 0.65fr',
            gap: 48,
            alignItems: 'center',
          }}
          className="landing-hero-grid"
        >
          <div>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--color-terra)',
                margin: '0 0 20px',
              }}
            >
              SDG 3 · MATERNAL HEALTH · 2026
            </p>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2.5rem, 5vw, var(--text-7xl))',
                fontWeight: 900,
                color: 'var(--color-charcoal)',
                lineHeight: 1.1,
                margin: '0 0 24px',
                maxWidth: 560,
              }}
            >
              Every 2 minutes,
              <br />
              a mother dies.
              <br />
              Not because we
              <br />
              lack medicine.
            </h1>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-lg)',
                color: 'var(--color-warm-gray)',
                lineHeight: 1.65,
                margin: '0 0 32px',
                maxWidth: 480,
              }}
            >
              Because no one reached her in time.
              <br />
              MamaAlert changes that — one tap, one community, one life saved.
            </p>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 16,
                marginBottom: 28,
              }}
            >
              <button
                type="button"
                className="landing-btn landing-btn--terra landing-btn--hero-primary landing-btn--pulse-idle"
                onClick={() => void install()}
                disabled={isInstalling}
                aria-describedby="pwa-install-explainer"
              >
                {isInstalling ? '…' : installLabel}
              </button>
              <Link to="/signup" className="landing-btn landing-btn--ghost landing-btn--hero-primary">
                Sign Up / Login →
              </Link>
            </div>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-sm)',
                color: 'var(--color-warm-gray)',
                margin: 0,
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px 16px',
                alignItems: 'center',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'var(--color-terra)',
                  }}
                />
                Works offline
              </span>
              <span style={{ color: 'var(--color-terra)' }} aria-hidden>
                ·
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'var(--color-terra)',
                  }}
                />
                No smartphone required
              </span>
              <span style={{ color: 'var(--color-terra)' }} aria-hidden>
                ·
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'var(--color-terra)',
                  }}
                />
                Free forever
              </span>
            </p>
          </div>
          <div style={{ justifySelf: 'end', width: '100%', maxWidth: 400 }}>
            <DeathCounter />
          </div>
        </div>
      </div>
      <style>{`
        @media (max-width: 991px) {
          .landing-hero-grid {
            grid-template-columns: 1fr !important;
            text-align: center;
          }
          .landing-hero-grid > div:first-child {
            order: 1;
          }
          .landing-hero-grid > div:last-child {
            order: 2;
            justify-self: center !important;
          }
          .landing-hero-grid h1 {
            margin-left: auto;
            margin-right: auto;
          }
          .landing-hero-grid > div:first-child p:last-of-type {
            justify-content: center;
          }
          .landing-hero-grid > div:first-child > div {
            justify-content: center;
          }
        }
      `}</style>
    </section>
  )
}
