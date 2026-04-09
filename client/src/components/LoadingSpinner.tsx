/**
 * Phase 4.1 default: full-screen overlay. Use `variant="inline"` inside routed views so lists are not covered by a fixed layer.
 */
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  variant?: 'fullscreen' | 'inline'
  className?: string
}

export function LoadingSpinner({ variant = 'fullscreen', className }: LoadingSpinnerProps) {
  const { t } = useTranslation()

  const inner = (
    <div
      className="flex items-center justify-center gap-2 text-muted-foreground"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Loader2 className="size-6 animate-spin motion-reduce:animate-none" aria-hidden />
      <span>{t('common.loading')}</span>
    </div>
  )

  if (variant === 'fullscreen') {
    return (
      <div
        className={cn(
          'fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm',
          className,
        )}
      >
        {inner}
      </div>
    )
  }

  return <div className={cn('flex w-full justify-center py-8', className)}>{inner}</div>
}
