import { useTranslation } from 'react-i18next'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

type BannerVariant = 'liveData' | 'liveDataSms' | 'formSubmit' | 'statusPage'

const variantToKeys: Record<
  BannerVariant,
  { title: string; detail?: 'network.offlineSmsAlertsHint' }
> = {
  liveData: { title: 'network.offlineLiveData' },
  liveDataSms: { title: 'network.offlineLiveData', detail: 'network.offlineSmsAlertsHint' },
  formSubmit: { title: 'network.offlineCannotSubmit' },
  statusPage: { title: 'network.offlineStatusPage' },
}

/**
 * Shown when `navigator` reports offline. Does not replace SOS offline queue UX on `/sos`.
 */
export function NetworkOfflineBanner({ variant }: { variant: BannerVariant }) {
  const { t } = useTranslation()
  const online = useOnlineStatus()
  if (online) {
    return null
  }
  const keys = variantToKeys[variant]
  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-md border border-amber-400/80 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100"
    >
      <p className="font-medium">{t(keys.title)}</p>
      {keys.detail ? <p className="mt-1 text-xs opacity-90">{t(keys.detail)}</p> : null}
    </div>
  )
}
