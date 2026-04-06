/**
 * Phase 4.1 — full-screen SOS control. Props match CURSOR_PROMPT (`onTrigger` + `status` only).
 */
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export type SosVisualStatus = 'idle' | 'sending' | 'sent' | 'offline' | 'error'

interface SOSButtonProps {
  onTrigger: () => Promise<void>
  status: SosVisualStatus
}

export function SOSButton({ onTrigger, status }: SOSButtonProps) {
  const { t } = useTranslation()

  const label =
    status === 'sending'
      ? t('sos.sending')
      : status === 'sent'
        ? t('sos.sent')
        : status === 'offline'
          ? t('sos.offline')
          : status === 'error'
            ? t('common.retry')
            : t('sos.button')

  const bgClass =
    status === 'sent'
      ? 'bg-green-600 hover:bg-green-700'
      : status === 'offline'
        ? 'bg-amber-600 hover:bg-amber-700'
        : status === 'error'
          ? 'bg-red-800 hover:bg-red-900'
          : 'bg-[#DC2626] hover:bg-red-700'

  const pulse = status === 'idle'

  return (
    <button
      type="button"
      disabled={status === 'sending' || status === 'sent'}
      onClick={() => void onTrigger()}
      className={cn(
        'flex min-h-[200px] min-w-[200px] max-h-[min(85vw,320px)] max-w-[min(85vw,320px)] flex-col items-center justify-center rounded-full px-6 text-center text-lg font-bold text-white shadow-lg transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-300 disabled:opacity-90',
        bgClass,
        pulse && 'animate-pulse',
      )}
      aria-label={t('sos.button')}
    >
      {status === 'sending' ? (
        <Loader2 className="mb-2 size-12 animate-spin" aria-hidden />
      ) : null}
      <span className="leading-tight">{label}</span>
    </button>
  )
}
