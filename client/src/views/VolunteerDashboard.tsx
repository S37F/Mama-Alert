import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCard } from '@/components/AlertCard'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'
import {
  getVolunteerFeed,
  postVolunteerResponse,
  volunteerSseUrl,
  type VolunteerFeedItem,
} from '@/services/api'
import { volunteerFeedItemToSummary } from '@/lib/volunteerFeed'

const LS_VOL_PHONE = 'mamaalert_volunteer_phone'
const DIAL_CODE_BY_REGION: Record<string, string> = {
  IN: '+91',
  US: '+1',
  GB: '+44',
  KE: '+254',
  TZ: '+255',
  UG: '+256',
  FR: '+33',
  PT: '+351',
  BR: '+55',
}

function normalizePhoneInput(value: string): string {
  const trimmed = value.replace(/[^\d+\s()-]/g, '')
  const withPlus = trimmed.startsWith('00') ? `+${trimmed.slice(2)}` : trimmed
  return withPlus.replace(/\s+/g, ' ').trim()
}

function minutesSince(iso: string): number {
  const t = new Date(iso).getTime()
  return Math.max(0, Math.floor((Date.now() - t) / 60_000))
}

export function VolunteerDashboard() {
  const { t } = useTranslation()
  const [phoneInput, setPhoneInput] = useState(() => localStorage.getItem(LS_VOL_PHONE) ?? '')
  const [savedPhone, setSavedPhone] = useState(() => localStorage.getItem(LS_VOL_PHONE) ?? '')
  const [items, setItems] = useState<VolunteerFeedItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actingId, setActingId] = useState<string | null>(null)
  const [confirmMsg, setConfirmMsg] = useState<string | null>(null)
  const countryHint = useMemo(() => {
    const region = (navigator.language || 'en').split('-')[1]?.toUpperCase()
    return region ? DIAL_CODE_BY_REGION[region] ?? '+<country code>' : '+<country code>'
  }, [])

  const persistPhone = useCallback(() => {
    const p = normalizePhoneInput(phoneInput)
    if (p.length >= 8) {
      localStorage.setItem(LS_VOL_PHONE, p)
      setPhoneInput(p)
      setSavedPhone(p)
    }
  }, [phoneInput])

  const load = useCallback(async () => {
    if (savedPhone.length < 8) {
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await getVolunteerFeed(savedPhone)
      setItems(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setLoading(false)
    }
  }, [savedPhone, t])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (savedPhone.length < 8) {
      return
    }
    let es: EventSource | null = null
    try {
      es = new EventSource(volunteerSseUrl(savedPhone))
    } catch {
      return
    }
    const onRefresh = (): void => {
      void load()
    }
    es.addEventListener('feed_refresh', onRefresh)
    es.addEventListener('connected', onRefresh)
    return () => {
      es?.close()
    }
  }, [savedPhone, load])

  const { active, past } = useMemo(() => {
    const activeList: VolunteerFeedItem[] = []
    const pastList: VolunteerFeedItem[] = []
    for (const it of items) {
      const needsResponse = it.response === null && it.status === 'active'
      if (needsResponse) {
        activeList.push(it)
      } else {
        pastList.push(it)
      }
    }
    return { active: activeList, past: pastList }
  }, [items])

  const onAccept = async (alertId: string) => {
    if (savedPhone.length < 8) {
      return
    }
    setActingId(alertId)
    setConfirmMsg(null)
    try {
      await postVolunteerResponse({ phone: savedPhone, alertId, response: 'YES' })
      setConfirmMsg(t('volunteer.directionsSent'))
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setActingId(null)
    }
  }

  const onDecline = async (alertId: string) => {
    if (savedPhone.length < 8) {
      return
    }
    setActingId(alertId)
    try {
      await postVolunteerResponse({ phone: savedPhone, alertId, response: 'NO' })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setActingId(null)
    }
  }

  if (savedPhone.length < 8) {
    return (
      <main id="main-content" tabIndex={-1} className="mx-auto max-w-lg space-y-4 p-6 text-base outline-none">
        <h1 className="text-2xl font-bold">{t('volunteer.title')}</h1>
        <div className="space-y-3 rounded-lg border p-4">
          <Label htmlFor="vol-phone">{t('volunteer.phoneLabel')}</Label>
          <Input
            id="vol-phone"
            type="tel"
            inputMode="tel"
            value={phoneInput}
            onChange={(e) => setPhoneInput(normalizePhoneInput(e.target.value))}
            onBlur={persistPhone}
            autoComplete="tel"
            placeholder={`${countryHint} 555 123 0000`}
            aria-describedby="vol-phone-hint"
          />
          <p id="vol-phone-hint" className="text-muted-foreground text-sm">
            {t('sos.phoneHint', { dialCode: countryHint })}
          </p>
          <Button type="button" className="w-full" onClick={persistPhone}>
            {t('volunteer.savePhone')}
          </Button>
        </div>
      </main>
    )
  }

  return (
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-lg space-y-6 p-6 text-base outline-none">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{t('volunteer.title')}</h1>
        <Badge variant="secondary">{items.length}</Badge>
      </div>

      {error ? <ErrorMessage message={error} onRetry={() => void load()} /> : null}
      {confirmMsg ? (
        <p className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-900 dark:border-green-900 dark:bg-green-950 dark:text-green-100">
          {confirmMsg}
        </p>
      ) : null}

      {loading && items.length === 0 ? <LoadingSpinner variant="inline" /> : null}

      {active.length === 0 && !loading ? (
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-12 text-center"
          aria-live="polite"
        >
          <span className="bg-primary/20 size-3 animate-pulse rounded-full" aria-hidden />
          <p className="text-muted-foreground">{t('volunteer.watching')}</p>
        </div>
      ) : null}

      <div className="space-y-4">
        {active.map((it) => {
          const summary = volunteerFeedItemToSummary(it)
          return (
            <AlertCard
              key={it.responseId}
              alert={summary}
              onAccept={onAccept}
              onDecline={onDecline}
              showActions
              actionsDisabled={actingId === it.alertId}
              minutesAgo={minutesSince(it.triggeredAt)}
              distanceLabel={
                it.distanceKm !== null ? t('volunteer.distance', { km: it.distanceKm }) : null
              }
            />
          )
        })}
      </div>

      {past.length > 0 ? (
        <div className="space-y-2">
          <h2 className="text-muted-foreground text-sm font-semibold uppercase">{t('volunteer.pastAlerts')}</h2>
          <div className="space-y-2 opacity-70">
            {past.slice(0, 12).map((it) => {
              const summary = volunteerFeedItemToSummary(it)
              return (
                <AlertCard
                  key={it.responseId}
                  alert={summary}
                  onAccept={onAccept}
                  onDecline={onDecline}
                  showActions={false}
                  minutesAgo={minutesSince(it.triggeredAt)}
                  distanceLabel={
                    it.distanceKm !== null ? t('volunteer.distance', { km: it.distanceKm }) : null
                  }
                />
              )
            })}
          </div>
        </div>
      ) : null}
    </main>
  )
}
