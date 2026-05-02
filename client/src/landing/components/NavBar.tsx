import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Menu, X } from 'lucide-react'
import { BrandLogo } from '@/components/BrandLogo'
import { usePWAInstall } from '@/landing/hooks/usePWAInstall'

export function NavBar() {
  const { t } = useTranslation()
  const [solid, setSolid] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const { install, isInstalled, isInstalling, canInstall } = usePWAInstall()
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const prevMenuOpen = useRef(false)

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

  useEffect(() => {
    if (prevMenuOpen.current && !menuOpen) {
      window.requestAnimationFrame(() => menuButtonRef.current?.focus())
    }
    prevMenuOpen.current = menuOpen
  }, [menuOpen])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  const label = isInstalled ? 'Open App' : canInstall ? 'Install App' : 'Continue in browser'

  return (
    <>
      {menuOpen ? (
        <div
          className="landing-nav-menu-backdrop"
          aria-hidden
          onClick={() => setMenuOpen(false)}
        />
      ) : null}
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
          <BrandLogo size="sm" tone="light" animated />
        </a>

        <nav
          aria-label="Primary"
          style={{ display: 'flex', alignItems: 'center', gap: 12 }}
          className="landing-nav-desktop"
        >
          <Link to="/signup" className="landing-btn landing-btn--ghost">
            Sign Up
          </Link>
          <button
            type="button"
            className="landing-btn landing-btn--terra"
            onClick={() => void install()}
            disabled={isInstalling}
            aria-describedby="pwa-install-explainer"
          >
            {isInstalling ? '...' : label}
          </button>
        </nav>

        <button
          ref={menuButtonRef}
          type="button"
          className="landing-nav-burger landing-btn landing-btn--ghost"
          aria-label={menuOpen ? t('a11y.closeMenu') : t('a11y.openMenu')}
          aria-expanded={menuOpen}
          aria-controls="landing-nav-drawer"
          onClick={() => setMenuOpen((o) => !o)}
          style={{ padding: '0 14px', minWidth: 44 }}
        >
          {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
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
            onClick={() => {
              setMenuOpen(false)
              void install()
            }}
            disabled={isInstalling}
            aria-describedby="pwa-install-explainer"
          >
            {isInstalling ? '...' : label}
          </button>
        </div>
      ) : null}

      <style>{`
        .landing-nav-menu-backdrop {
          position: fixed;
          inset: 0;
          z-index: 95;
          background: rgba(44, 36, 22, 0.35);
        }
        .landing-nav-burger { display: none; }
        .landing-nav-desktop { display: flex; }
        @media (max-width: 767px) {
          .landing-nav-burger { display: inline-flex; }
          .landing-nav-desktop { display: none; }
        }
      `}</style>
    </header>
    </>
  )
}
