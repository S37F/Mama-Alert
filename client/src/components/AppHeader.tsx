import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'
import { BrandLogo } from '@/components/BrandLogo'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function AppHeader() {
  const { t } = useTranslation()
  const location = useLocation()
  const pathname = location.pathname

  const sectionLabel = useMemo(() => {
    if (pathname.startsWith('/status')) {
      return t('nav.sectionFamilyStatus')
    }
    if (pathname === '/signup') {
      return t('nav.sectionAccess')
    }
    if (pathname === '/volunteer') {
      return t('nav.sectionVolunteer')
    }
    if (pathname === '/hospital/register') {
      return t('nav.sectionClinicRegistration')
    }
    if (pathname === '/hospital') {
      return t('nav.sectionClinic')
    }
    if (pathname === '/demo') {
      return t('nav.sectionDemo')
    }
    return t('nav.brand')
  }, [pathname, t])

  return (
    <header className="mama-sticky-header-safe sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85">
      <div className="mx-auto flex min-h-[3.25rem] w-full max-w-6xl items-center justify-between gap-3 px-4 pb-px sm:min-h-16 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="flex min-w-0 items-center gap-3 text-foreground no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <BrandLogo size="sm" tone="light" animated className="min-w-0" />
          <span className="min-w-0 border-l border-border pl-3">
            <span className="mama-copy mt-1 block truncate text-xs font-medium text-muted-foreground">{sectionLabel}</span>
          </span>
        </Link>

        <nav className="flex shrink-0 items-center gap-2" aria-label={t('nav.ariaApp')}>
          <Link
            to="/sos/register"
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'inline-flex shrink-0 min-h-10')}
          >
            {t('nav.linkSos')}
          </Link>
          <Link
            to="/signup"
            className={cn(buttonVariants({ size: 'sm' }), 'min-h-10', pathname === '/signup' && 'hidden')}
          >
            {t('nav.linkSignUp')}
          </Link>
        </nav>
      </div>
    </header>
  )
}
