import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertCard } from '@/components/AlertCard'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'
import { NetworkOfflineBanner } from '@/components/NetworkOfflineBanner'
import { useAuth } from '@/hooks/useAuth'
import {
  getVolunteerFeed,
  postVolunteerResponse,
  volunteerSseUrl,
  type VolunteerFeedItem,
} from '@/services/api'
import { volunteerFeedItemToSummary } from '@/lib/volunteerFeed'

function minutesSince(iso: string): number {
  const timestamp = new Date(iso).getTime()
  return Math.max(0, Math.floor((Date.now() - timestamp) / 60_000))
}

export function VolunteerDashboard() {
  const { t } = useTranslation()
  const { session, logout } = useAuth()
  const portalToken = session?.role === 'volunteer' ? session.volunteerPortalToken ?? '' : ''
  const sessionReady = session?.role === 'volunteer'
  const [items, setItems] = useState<VolunteerFeedItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actingId, setActingId] = useState<string | null>(null)
  const [confirmMsg, setConfirmMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionReady) {
      return
    }
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await getVolunteerFeed()
        if (!cancelled) {
          setItems(data)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t('common.error'))
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }
    void load()

    let es: EventSource | null = null
    try {
      es = new EventSource(volunteerSseUrl(portalToken || undefined), { withCredentials: true })
      const onRefresh = () => {
        void load()
      }
      es.addEventListener('feed_refresh', onRefresh)
      es.addEventListener('connected', onRefresh)
    } catch {
      /* keep polling fallback */
    }

    const pollId = window.setInterval(() => {
      void load()
    }, 60_000)

    return () => {
      cancelled = true
      window.clearInterval(pollId)
      es?.close()
    }
  }, [portalToken, sessionReady, t])

  const { active, past } = useMemo(() => {
    const activeItems: VolunteerFeedItem[] = []
    const pastItems: VolunteerFeedItem[] = []
    for (const item of items) {
      if (item.response === null && item.status === 'active') {
        activeItems.push(item)
      } else {
        pastItems.push(item)
      }
    }
    return { active: activeItems, past: pastItems }
  }, [items])

  if (!session || session.role !== 'volunteer' || !sessionReady) {
    return <Navigate to="/signup?mode=login" replace />
  }

  const reload = async () => {
    try {
      const data = await getVolunteerFeed()
      setItems(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
    }
  }

  const onAccept = async (alertId: string) => {
    setActingId(alertId)
    setConfirmMsg(null)
    try {
      await postVolunteerResponse({ alertId, response: 'YES' })
      setConfirmMsg(t('volunteer.directionsSent'))
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setActingId(null)
    }
  }

  const onDecline = async (alertId: string) => {
    setActingId(alertId)
    try {
      await postVolunteerResponse({ alertId, response: 'NO' })
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setActingId(null)
    }
  }

  return (
    <main id="main-content" tabIndex={-1} className="mama-page mama-page-shell mama-page-shell--narrow space-y-6 text-base">
      <NetworkOfflineBanner variant="liveDataSms" />
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="mama-heading text-2xl">{t('volunteer.title')}</h1>
          <p className="mama-copy text-sm">{session.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{items.length}</Badge>
          <Button type="button" variant="outline" size="sm" onClick={() => void logout()}>
            {t('auth.signOut')}
          </Button>
        </div>
      </div>

      {error ? <ErrorMessage message={error} onRetry={() => void reload()} /> : null}
      {confirmMsg ? (
        <p className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-900">
          {confirmMsg}
        </p>
      ) : null}

      <p className="mama-panel-compact text-muted-foreground p-3 text-sm">
        {t('volunteer.smsPrimary')}
      </p>

      {loading && items.length === 0 ? <LoadingSpinner variant="inline" /> : null}

      {active.length === 0 && !loading ? (
        <div
          className="mama-empty-state"
          aria-live="polite"
        >
          <span className="bg-primary/20 size-3 animate-pulse rounded-full" aria-hidden />
          <p className="text-muted-foreground">{t('volunteer.watching')}</p>
        </div>
      ) : null}

      <div className="space-y-4">
        {active.map((item) => {
          const summary = volunteerFeedItemToSummary(item)
          return (
            <AlertCard
              key={item.responseId}
              alert={summary}
              onAccept={onAccept}
              onDecline={onDecline}
              showActions
              actionsDisabled={actingId === item.alertId}
              minutesAgo={minutesSince(item.triggeredAt)}
              distanceLabel={item.distanceKm !== null ? t('volunteer.distance', { km: item.distanceKm }) : null}
            />
          )
        })}
      </div>

      {past.length > 0 ? (
        <div className="space-y-2">
          <h2 className="text-muted-foreground text-sm font-semibold uppercase">{t('volunteer.pastAlerts')}</h2>
          <div className="space-y-2 opacity-70">
            {past.slice(0, 12).map((item) => {
              const summary = volunteerFeedItemToSummary(item)
              return (
                <AlertCard
                  key={item.responseId}
                  alert={summary}
                  onAccept={onAccept}
                  onDecline={onDecline}
                  showActions={false}
                  minutesAgo={minutesSince(item.triggeredAt)}
                  distanceLabel={item.distanceKm !== null ? t('volunteer.distance', { km: item.distanceKm }) : null}
                />
              )
            })}
          </div>
        </div>
      ) : null}
    </main>
  )
}
