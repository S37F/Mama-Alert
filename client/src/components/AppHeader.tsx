import { Link, useLocation } from 'react-router-dom'
import { BrandLogo } from '@/components/BrandLogo'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const routeLabels: Record<string, string> = {
  '/signup': 'Access',
  '/volunteer': 'Volunteer',
  '/hospital': 'Clinic',
  '/demo': 'Demo',
}

export function AppHeader() {
  const location = useLocation()
  const pathname = location.pathname
  const sectionLabel = pathname.startsWith('/status') ? 'Family status' : routeLabels[pathname] ?? 'MamaAlert'

  return (
    <header className="mama-sticky-header-safe sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
      <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 pb-px sm:px-6 lg:px-8">
        <Link to="/" className="flex min-w-0 items-center gap-3 text-foreground no-underline">
          <BrandLogo size="sm" tone="light" animated className="min-w-0" />
          <span className="min-w-0 border-l border-border pl-3">
            <span className="mama-copy mt-1 block truncate text-xs font-medium">{sectionLabel}</span>
          </span>
        </Link>

        <nav className="flex shrink-0 items-center gap-2" aria-label="App">
          <Link to="/sos/register" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'inline-flex shrink-0')}>
            SOS
          </Link>
          <Link to="/signup" className={cn(buttonVariants({ size: 'sm' }), pathname === '/signup' && 'hidden')}>
            Sign Up
          </Link>
        </nav>
      </div>
    </header>
  )
}
