import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { BrandLogo } from '@/components/BrandLogo'

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
            <BrandLogo tone="dark" size="md" animated style={{ marginBottom: 12 }} />
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
            <Link to="/signup" style={linkStyle}>
              Sign up or log in
            </Link>
            <Link to="/signup?role=health_worker" style={linkStyle}>
              For health workers
            </Link>
            <Link to="/signup?role=admin" style={linkStyle}>
              For admins
            </Link>
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
          (c) 2026 MamaAlert - Open Source - Built for the women who need it most
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
