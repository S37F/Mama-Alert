import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usePWAInstall } from '@/landing/hooks/usePWAInstall'

export function NavBar() {
  const { t } = useTranslation()
  const [solid, setSolid] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const { install, isInstalled, isInstalling, canInstall } = usePWAInstall()

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 80)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!menuOpen) {
      return
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  const label = isInstalled ? 'Open App' : canInstall ? 'Install App' : 'Open App'

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        transition: 'background-color 0.35s ease, border-color 0.35s ease',
        backgroundColor: solid ? 'var(--color-card)' : 'transparent',
        borderBottom: solid ? '1px solid var(--color-sand-dark)' : '1px solid transparent',
      }}
    >
      <div
        className="landing-container"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 72,
          gap: 16,
        }}
      >
        <a
          href="#top"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            textDecoration: 'none',
            color: 'inherit',
          }}
        >
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: 'var(--color-terra)',
              flexShrink: 0,
              animation: 'landing-nav-pulse 2s ease-in-out infinite',
            }}
          />
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 'var(--text-xl)',
              color: 'var(--color-charcoal)',
            }}
          >
            MamaAlert
          </span>
        </a>

        <nav
          aria-label="Primary"
          style={{ display: 'flex', alignItems: 'center', gap: 12 }}
          className="landing-nav-desktop"
        >
          <Link
            to="/signup"
            className="landing-btn landing-btn--ghost"
          >
            Sign Up
          </Link>
          <button
            type="button"
            className="landing-btn landing-btn--terra"
            onClick={() => void install()}
            disabled={isInstalling}
            aria-describedby="pwa-install-explainer"
          >
            {isInstalling ? '…' : label}
          </button>
        </nav>

        <button
          type="button"
          className="landing-nav-burger landing-btn landing-btn--ghost"
          aria-label={menuOpen ? t('a11y.closeMenu') : t('a11y.openMenu')}
          aria-expanded={menuOpen}
          aria-controls="landing-nav-drawer"
          onClick={() => setMenuOpen((o) => !o)}
          style={{ padding: '0 14px', minWidth: 44 }}
        >
          <span style={{ fontSize: 22, lineHeight: 1 }}>{menuOpen ? '×' : '☰'}</span>
        </button>
      </div>

      {menuOpen ? (
        <div
          id="landing-nav-drawer"
          className="landing-nav-drawer"
          role="navigation"
          aria-label={t('a11y.siteMenu')}
          style={{
            borderBottom: '1px solid var(--color-sand-dark)',
            background: 'var(--color-card)',
            padding: '16px 24px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <Link
            to="/signup"
            className="landing-btn landing-btn--ghost"
            style={{ width: '100%' }}
            onClick={() => setMenuOpen(false)}
          >
            Sign Up
          </Link>
          <button
            type="button"
            className="landing-btn landing-btn--terra"
            style={{ width: '100%' }}
            onClick={() => void install()}
            disabled={isInstalling}
            aria-describedby="pwa-install-explainer"
          >
            {isInstalling ? '…' : label}
          </button>
        </div>
      ) : null}

      <style>{`
        @keyframes landing-nav-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.75; transform: scale(1.15); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes landing-nav-pulse {
            0%, 100% { opacity: 1; transform: none; }
          }
        }
        .landing-nav-burger { display: none; }
        .landing-nav-desktop { display: flex; }
        @media (max-width: 767px) {
          .landing-nav-burger { display: inline-flex; }
          .landing-nav-desktop { display: none; }
        }
      `}</style>
    </header>
  )
}
