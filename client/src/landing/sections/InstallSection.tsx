import { Link } from 'react-router-dom'
import { usePWAInstall } from '@/landing/hooks/usePWAInstall'

export function InstallSection() {
  const { install, isInstalled, isInstalling, canInstall } = usePWAInstall()
  const primary = isInstalled ? 'Open App' : canInstall ? 'Install App' : 'Continue in browser'

  return (
    <section
      id="install"
      className="landing-section"
      style={{
        background: 'var(--color-terra)',
        paddingTop: 100,
        paddingBottom: 100,
      }}
    >
      <div className="landing-container" style={{ textAlign: 'center' }}>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-sm)',
            fontWeight: 600,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--color-cream)',
            margin: '0 0 20px',
          }}
        >
          READY TO SAVE A LIFE
        </p>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2.5rem, 5vw, 4rem)',
            fontWeight: 700,
            color: 'var(--color-white)',
            margin: '0 0 20px',
            lineHeight: 1.1,
          }}
        >
          MamaAlert.
          <br />
          Install it today.
        </h2>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-xl)',
            color: 'rgba(253, 250, 246, 0.85)',
            margin: '0 0 40px',
            lineHeight: 1.5,
          }}
        >
          Free. Forever. For every community that needs it.
        </p>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 16,
            justifyContent: 'center',
            marginBottom: 32,
          }}
        >
          <button
            type="button"
            className="landing-btn landing-btn--install-cta"
            style={{
              background: 'var(--color-white)',
              color: 'var(--color-terra)',
              border: '1px solid var(--color-white)',
              minWidth: 200,
            }}
            onClick={() => void install()}
            disabled={isInstalling}
            aria-describedby="pwa-install-explainer"
          >
            {isInstalling ? '...' : primary}
          </button>
          <Link
            to="/signup"
            className="landing-btn landing-btn--install-cta"
            style={{
              background: 'transparent',
              color: 'var(--color-white)',
              border: '2px solid var(--color-white)',
              minWidth: 200,
            }}
          >
            Sign Up / Login →
          </Link>
        </div>

        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-sm)',
            color: 'rgba(253, 250, 246, 0.92)',
            margin: '0 0 40px',
            lineHeight: 1.6,
          }}
        >
          Works on Android · iOS · Any phone via SMS · Feature phones via USSD
        </p>

        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <p
            id="pwa-install-explainer"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-sm)',
              color: 'rgba(253, 250, 246, 0.75)',
              lineHeight: 1.65,
              margin: 0,
            }}
          >
            <strong style={{ color: 'var(--color-cream)', display: 'block', marginBottom: 10 }}>
              What does &quot;Install&quot; mean?
            </strong>
            MamaAlert is a Progressive Web App — no app store required. Tap Install, tap &quot;Add to Home Screen&quot;, and it
            lives on your phone like any app. Works offline. Uses no storage. Reaches you by SMS even when you close it.
          </p>
        </div>
      </div>
    </section>
  )
}
