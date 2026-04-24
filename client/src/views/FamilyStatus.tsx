import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'
import { NetworkOfflineBanner } from '@/components/NetworkOfflineBanner'
import { getFamilyStatus, type FamilyStatusPayload } from '@/services/api'

/** Matches VALIDATION_QUESTIONS.md demo URL; resolves to seed `status_token` UUID. */
const DEMO_STATUS_SLUG = 'demo-status-token-abc123'
const DEFAULT_DEMO_STATUS_TOKEN = 'a0000000-1111-4222-8333-000000000001'

function formatRelative(msAgo: number): string {
  const s = Math.floor(msAgo / 1000)
  if (s < 60) {
    return `${s}s`
  }
  if (s < 3600) {
    return `${Math.floor(s / 60)}m`
  }
  return `${Math.floor(s / 3600)}h`
}

export function FamilyStatus() {
  const { t } = useTranslation()
  const { token: rawToken } = useParams<{ token: string }>()
  const [data, setData] = useState<FamilyStatusPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null)

  const resolvedToken =
    rawToken === DEMO_STATUS_SLUG
      ? (import.meta.env.VITE_DEMO_STATUS_TOKEN as string | undefined)?.trim() || DEFAULT_DEMO_STATUS_TOKEN
      : rawToken

  const load = useCallback(async () => {
    if (!resolvedToken) {
      setError(t('family.invalidToken'))
      setLoading(false)
      return
    }
    setError(null)
    try {
      const d = await getFamilyStatus(resolvedToken)
      setData(d)
      setLastFetchedAt(Date.now())
    } catch {
      setError(typeof navigator !== 'undefined' && !navigator.onLine ? t('network.offlineStatusPage') : t('family.notFound'))
    } finally {
      setLoading(false)
    }
  }, [resolvedToken, t])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const id = window.setInterval(() => {
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        void load()
      }
    }, 30_000)
    return () => window.clearInterval(id)
  }, [load])

  useEffect(() => {
    const onOnline = () => void load()
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [load])

  if (loading && !data) {
    return (
      <main id="main-content" tabIndex={-1} className="mama-page flex min-h-screen items-center justify-center p-6 outline-none">
        <LoadingSpinner variant="inline" />
      </main>
    )
  }

  if (error || !data) {
    return (
      <main id="main-content" tabIndex={-1} className="mama-page mama-page-shell mama-page-shell--narrow space-y-4">
        <NetworkOfflineBanner variant="statusPage" />
        <ErrorMessage message={error ?? t('common.error')} onRetry={() => void load()} />
      </main>
    )
  }

  const steps: { done: boolean; label: string }[] = [
    { done: data.alertStatus !== 'none', label: t('family.alertReceived') },
    {
      done: Boolean(data.volunteerFirstName),
      label: data.volunteerFirstName
        ? t('family.volunteerResponding', { name: data.volunteerFirstName })
        : t('family.findingHelp'),
    },
    {
      done: ['at_facility', 'resolved'].includes(data.alertStatus),
      label:
        data.hospitalName && (data.alertStatus === 'resolved' || data.alertStatus === 'at_facility')
          ? t('family.arrivedBeingCaredFor', { hospital: data.hospitalName })
          : data.hospitalName
            ? t('family.enRouteToHospital', { hospital: data.hospitalName })
            : t('family.enRouteClinic'),
    },
    {
      done: data.alertStatus === 'resolved',
      label: data.alertStatus === 'resolved' ? t('family.resolved') : t('family.carePending'),
    },
  ]

  return (
    <main id="main-content" tabIndex={-1} className="mama-page mama-page-shell mama-page-shell--narrow space-y-8">
      <NetworkOfflineBanner variant="statusPage" />
      <div>
        <h1 className="mama-heading text-2xl">{t('family.title')}</h1>
        <p className="mama-copy mt-1 text-lg">{data.patientFirstName}</p>
      </div>

      <ol className="mama-panel-compact relative space-y-6 border-s-2 border-border p-6 ps-8">
        {steps.map((s, i) => (
          <li key={i} className="relative">
            <span
              className={`absolute -start-[29px] mt-1.5 size-3 rounded-full border-2 ${
                s.done ? 'border-green-600 bg-green-600' : 'border-muted-foreground bg-background'
              }`}
              aria-hidden
            />
            <p className={s.done ? 'font-medium text-foreground' : 'text-muted-foreground'}>{s.label}</p>
          </li>
        ))}
      </ol>

      <p className="text-muted-foreground text-center text-xs">
        {t('family.lastUpdate', {
          time: lastFetchedAt != null ? formatRelative(Date.now() - lastFetchedAt) : '—',
        })}
      </p>
    </main>
  )
}
