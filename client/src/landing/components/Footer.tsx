import type { CSSProperties } from 'react'

export function Footer() {
  const linkStyle: CSSProperties = {
    color: 'var(--color-muted)',
    textDecoration: 'none',
    fontSize: 'var(--text-sm)',
    display: 'block',
    marginBottom: 10,
    fontFamily: 'var(--font-body)',
  }

  return (
    <footer
      style={{
        background: 'var(--color-charcoal)',
        color: 'var(--color-warm-gray)',
        padding: '64px 0 32px',
      }}
    >
      <div className="landing-container">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 48,
            marginBottom: 48,
          }}
          className="landing-footer-grid"
        >
          <div>
            <p
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--text-2xl)',
                fontWeight: 700,
                color: 'var(--color-terra-light)',
                margin: '0 0 12px',
              }}
            >
              MamaAlert
            </p>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-sm)',
                color: 'var(--color-muted)',
                margin: 0,
                lineHeight: 1.6,
              }}
            >
              One tap. One community. One life saved.
            </p>
          </div>
          <div>
            <p
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--text-lg)',
                color: 'var(--color-card)',
                margin: '0 0 16px',
              }}
            >
              Links
            </p>
            <a href="#how-it-works" style={linkStyle}>
              How it works
            </a>
            <a href="#install" style={linkStyle}>
              Install the app
            </a>
            <a href="/volunteer" style={linkStyle}>
              Register as volunteer
            </a>
            <a href="/register" style={linkStyle}>
              For health workers
            </a>
          </div>
          <div>
            <p
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--text-lg)',
                color: 'var(--color-card)',
                margin: '0 0 16px',
              }}
            >
              Built for
            </p>
            <p style={{ ...linkStyle, marginBottom: 8 }}>SDG 3: Good Health & Well-Being</p>
            <p style={{ ...linkStyle, marginBottom: 8 }}>Rural communities worldwide</p>
            <p style={{ ...linkStyle, marginBottom: 8 }}>Community health workers</p>
            <p style={{ ...linkStyle, marginBottom: 0 }}>NGO field partners</p>
          </div>
        </div>
        <div
          style={{
            borderTop: '1px solid rgba(232, 213, 188, 0.2)',
            paddingTop: 24,
            fontSize: 'var(--text-xs)',
            color: 'var(--color-muted)',
            fontFamily: 'var(--font-body)',
            textAlign: 'center',
          }}
        >
          © 2026 MamaAlert · Open Source · Built for the women who need it most
        </div>
      </div>
      <style>{`
        @media (max-width: 767px) {
          .landing-footer-grid {
            grid-template-columns: 1fr !important;
            gap: 36px !important;
          }
        }
      `}</style>
    </footer>
  )
}
