import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'
import { getFamilyStatus, type FamilyStatusPayload } from '@/services/api'

/** Matches VALIDATION_QUESTIONS.md demo URL; resolves to seed `status_token` UUID. */
const DEMO_STATUS_SLUG = 'demo-status-token-abc123'
const DEFAULT_DEMO_STATUS_TOKEN = 'a0000000-1111-4222-8333-000000000001'

function formatRelative(iso: string | null): string {
  if (!iso) {
    return '—'
  }
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
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
    } catch {
      setError(t('family.notFound'))
    } finally {
      setLoading(false)
    }
  }, [resolvedToken, t])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const id = window.setInterval(() => void load(), 30_000)
    return () => window.clearInterval(id)
  }, [load])

  if (loading && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <LoadingSpinner variant="inline" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-lg p-6">
        <ErrorMessage message={error ?? t('common.error')} onRetry={() => void load()} />
      </div>
    )
  }

  const steps: { done: boolean; label: string }[] = [
    { done: data.alertStatus !== 'none', label: t('family.alertReceived') },
    {
      done: Boolean(data.volunteerName),
      label: data.volunteerName
        ? t('family.volunteerResponding', { name: data.volunteerName })
        : t('family.findingHelp'),
    },
    {
      done: Boolean(data.hospitalName),
      label: data.hospitalName
        ? t('family.atFacility', { hospital: data.hospitalName })
        : t('family.enRouteClinic'),
    },
    {
      done: data.alertStatus === 'resolved',
      label: data.alertStatus === 'resolved' ? t('family.resolved') : t('family.carePending'),
    },
  ]

  return (
    <div className="mx-auto max-w-lg space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold">{t('family.title')}</h1>
        <p className="text-muted-foreground mt-1 text-lg">{data.patientFirstName}</p>
      </div>

      <ol className="relative space-y-6 border-s-2 border-border ps-6">
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
        {t('family.lastUpdate', { time: formatRelative(data.lastUpdated) })}
      </p>
    </div>
  )
}
