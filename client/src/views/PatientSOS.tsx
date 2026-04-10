import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { SOSButton, type SosVisualStatus } from '@/components/SOSButton'
import { useOfflineQueue } from '@/hooks/useOfflineQueue'
import { ApiHttpError, postPatientHints, postSos } from '@/services/api'

const LS_PHONE = 'mamaalert_patient_phone'
const LS_NAME = 'mamaalert_patient_display_name'
const LS_WEEKS = 'mamaalert_patient_weeks'
const LS_SOS_TOKEN = 'mamaalert_sos_token'
const LS_NOTIF_PROMPTED = 'mamaalert_notifications_prompted_v1'

const LANGS = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'fr', label: 'Français' },
  { code: 'sw', label: 'Kiswahili' },
  { code: 'ar', label: 'العربية' },
  { code: 'pt', label: 'Português' },
] as const

const SUPPORTED_LOCALES = new Set(LANGS.map((l) => l.code))

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

export function PatientSOS() {
  const { t, i18n } = useTranslation()
  const [searchParams] = useSearchParams()
  const { addToQueue, processPending } = useOfflineQueue()

  const [manualPhone, setManualPhone] = useState('')
  const [showHowItWorks, setShowHowItWorks] = useState(false)
  const [locationPrompted, setLocationPrompted] = useState(false)

  const storedPhone = useMemo(() => {
    const q = searchParams.get('phone')
    if (q && q.trim().length >= 8) {
      return q.trim()
    }
    return localStorage.getItem(LS_PHONE) ?? ''
  }, [searchParams])

  const effectivePhone = manualPhone.trim().length >= 8 ? manualPhone.trim() : storedPhone
  const helpPhone = import.meta.env.VITE_HELP_PHONE ?? '112'

  const countryHint = useMemo(() => {
    const locale = i18n.resolvedLanguage || navigator.language || 'en'
    const region = locale.split('-')[1]?.toUpperCase()
    return region ? DIAL_CODE_BY_REGION[region] ?? '+<country code>' : '+<country code>'
  }, [i18n.resolvedLanguage])

  const displayName = useMemo(() => {
    const q = searchParams.get('name')
    if (q && q.trim().length > 0) {
      return q.trim()
    }
    return localStorage.getItem(LS_NAME) ?? t('sos.title')
  }, [searchParams, t])

  const weeksPregnant = useMemo(() => {
    const q = searchParams.get('weeks')
    if (q && /^\d+$/.test(q)) {
      return Number(q)
    }
    const ls = localStorage.getItem(LS_WEEKS)
    if (ls && /^\d+$/.test(ls)) {
      return Number(ls)
    }
    return null
  }, [searchParams])

  useEffect(() => {
    const p = searchParams.get('phone')
    const n = searchParams.get('name')
    const w = searchParams.get('weeks')
    const tok = searchParams.get('token')
    if (p && p.trim().length >= 8) {
      localStorage.setItem(LS_PHONE, p.trim())
    }
    if (n && n.trim().length > 0) {
      localStorage.setItem(LS_NAME, n.trim())
    }
    if (w && /^\d+$/.test(w)) {
      localStorage.setItem(LS_WEEKS, w)
    }
    if (tok && tok.trim().length >= 24) {
      localStorage.setItem(LS_SOS_TOKEN, tok.trim())
    }
  }, [searchParams])

  const sosToken = useMemo(() => {
    const q = searchParams.get('token')
    if (q && q.trim().length >= 24) {
      return q.trim()
    }
    return localStorage.getItem(LS_SOS_TOKEN) ?? ''
  }, [searchParams])

  const missingToken = sosToken.length < 24

  useEffect(() => {
    if (missingToken || effectivePhone.length < 8) {
      return
    }
    if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
      return
    }
    if (localStorage.getItem(LS_NOTIF_PROMPTED)) {
      return
    }
    let cancelled = false
    void (async () => {
      try {
        await navigator.serviceWorker.ready
        if (cancelled) {
          return
        }
        if (Notification.permission === 'default') {
          await Notification.requestPermission()
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) {
          localStorage.setItem(LS_NOTIF_PROMPTED, '1')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [effectivePhone, missingToken])

  useEffect(() => {
    const apiBase = import.meta.env.VITE_API_URL ?? ''
    if (sosToken.length < 24 || apiBase.length === 0) {
      return
    }
    let cancelled = false
    void (async () => {
      const hints = await postPatientHints(sosToken)
      if (cancelled || !hints) {
        return
      }
      const lang = hints.language.toLowerCase().split('-')[0] ?? 'en'
      if (SUPPORTED_LOCALES.has(lang as (typeof LANGS)[number]['code'])) {
        await i18n.changeLanguage(lang)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [sosToken, i18n])

  const [status, setStatus] = useState<SosVisualStatus>('idle')
  const [duplicateCooldown, setDuplicateCooldown] = useState(false)

  const statusAnnouncement = useMemo(() => {
    switch (status) {
      case 'sending':
        return t('a11y.sosAnnouncementSending')
      case 'sent':
        return duplicateCooldown ? t('a11y.sosAnnouncementDuplicate') : t('a11y.sosAnnouncementSent')
      case 'offline':
        return t('a11y.sosAnnouncementOffline')
      case 'error':
        return t('a11y.sosAnnouncementError')
      default:
        return ''
    }
  }, [duplicateCooldown, status, t])
  const [isOnline, setIsOnline] = useState(
    () => typeof navigator !== 'undefined' && navigator.onLine,
  )

  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true)
      void processPending()
    }
    const onOffline = () => setIsOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [processPending])

  const persistPhone = useCallback(() => {
    const p = normalizePhoneInput(manualPhone)
    if (p.length >= 8) {
      localStorage.setItem(LS_PHONE, p)
      setManualPhone(p)
    }
  }, [manualPhone])

  const requestLocationAccess = useCallback(async () => {
    if (locationPrompted || !('geolocation' in navigator)) {
      return
    }
    setLocationPrompted(true)
    await new Promise<void>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        () => resolve(),
        () => resolve(),
        { enableHighAccuracy: false, timeout: 6000, maximumAge: 60_000 },
      )
    })
  }, [locationPrompted])

  const triggerSos = useCallback(async () => {
    if (sosToken.length < 24) {
      setStatus('error')
      return
    }

    const payload = { sosToken, triggerMethod: 'pwa' as const }

    if (!isOnline) {
      await addToQueue(payload)
      setStatus('offline')
      return
    }

    await requestLocationAccess()
    setStatus('sending')
    setDuplicateCooldown(false)
    try {
      await postSos(payload)
      setStatus('sent')
    } catch (err) {
      if (err instanceof ApiHttpError) {
        if (err.statusCode === 409) {
          setDuplicateCooldown(true)
          setStatus('sent')
          return
        }
        if (err.statusCode === 404) {
          setStatus('error')
          return
        }
        setStatus('error')
        return
      }
      try {
        await addToQueue(payload)
        setStatus('offline')
      } catch {
        setStatus('error')
      }
    }
  }, [addToQueue, sosToken, isOnline, requestLocationAccess])

  return (
    <main id="main-content" tabIndex={-1} className="relative flex min-h-[100dvh] flex-col bg-background outline-none">
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {statusAnnouncement}
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 pb-20 pt-16 text-base">
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            {t('sos.greeting', { name: displayName })}
          </h1>
          {weeksPregnant !== null ? (
            <p className="mt-2 text-xl text-foreground/90">{t('sos.weeks', { n: weeksPregnant })}</p>
          ) : null}
          {!isOnline ? (
            <p
              className="mt-3 rounded-md border border-amber-400/70 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900"
              role="status"
              aria-live="polite"
            >
              {t('sos.networkOfflineHint')}
            </p>
          ) : null}
        </div>

        {missingToken ? (
          <div className="w-full max-w-sm space-y-3 rounded-lg border border-border p-4 text-center">
            <p className="text-muted-foreground text-sm">
              Open your SOS link from your health worker (includes a <code className="text-xs">token</code> in the URL), or
              ask them to resend it.
            </p>
          </div>
        ) : null}

        {!missingToken ? (
          <div className="w-full max-w-sm space-y-3 rounded-lg border border-border p-4">
            <Label htmlFor="sos-phone" className="text-base">
              {t('sos.phoneLabel')}
            </Label>
            <Input
              id="sos-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              className="text-lg"
              value={manualPhone}
              onChange={(e) => setManualPhone(normalizePhoneInput(e.target.value))}
              onBlur={persistPhone}
              placeholder={`${countryHint} 555 123 0000`}
              aria-describedby="sos-phone-hint"
            />
            <p id="sos-phone-hint" className="text-muted-foreground text-sm">
              {t('sos.phoneHint', { dialCode: countryHint })}
            </p>
            <Button type="button" className="w-full" onClick={persistPhone}>
              {t('sos.savePhone')}
            </Button>
          </div>
        ) : null}

        {!missingToken && effectivePhone.length >= 8 ? (
          <SOSButton
            status={status}
            onTrigger={async () => {
              if (status === 'error') {
                setStatus('idle')
              }
              await triggerSos()
            }}
          />
        ) : null}

        {!missingToken && effectivePhone.length < 8 ? (
          <p className="text-muted-foreground max-w-sm text-center text-sm">
            Add your phone number so we can reach you if needed.
          </p>
        ) : null}

        {status === 'offline' ? (
          <p className="max-w-sm text-center text-sm font-medium text-foreground/85">{t('sos.offlineSubtext')}</p>
        ) : null}

        {status === 'sent' ? (
          <div className="max-w-sm space-y-3 text-center">
            <p className="text-muted-foreground text-sm">{duplicateCooldown ? t('sos.duplicateDetail') : t('sos.sentDetail')}</p>
            <Button type="button" variant="outline" size="sm" onClick={() => { setStatus('idle'); setDuplicateCooldown(false) }}>
              {t('sos.reset')}
            </Button>
          </div>
        ) : null}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 px-3 py-2 backdrop-blur">
        <div className="mx-auto grid w-full max-w-md grid-cols-3 gap-2">
          <a
            href={`tel:${helpPhone}`}
            aria-label={t('a11y.callEmergency', { phone: helpPhone })}
            className={cn(
              buttonVariants({ variant: 'outline', size: 'sm' }),
              'justify-center text-center text-xs font-semibold',
            )}
          >
            {t('sos.helpCall')}
          </a>
          <DropdownMenu>
            <DropdownMenuTrigger
              type="button"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'text-xs font-semibold')}
              aria-label={t('a11y.chooseLanguage')}
            >
              {t('sos.language')}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center">
              {LANGS.map((l) => (
                <DropdownMenuItem key={l.code} onClick={() => void i18n.changeLanguage(l.code)}>
                  {l.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            id="sos-how-toggle"
            type="button"
            variant="outline"
            size="sm"
            className="text-xs font-semibold"
            onClick={() => setShowHowItWorks((prev) => !prev)}
            aria-expanded={showHowItWorks}
            aria-controls="sos-how-works"
          >
            {t('sos.helpHow')}
          </Button>
        </div>
        {showHowItWorks ? (
          <p
            id="sos-how-works"
            role="region"
            aria-labelledby="sos-how-toggle"
            className="mx-auto mt-2 max-w-md rounded-md bg-muted px-3 py-2 text-xs text-foreground/90"
          >
            {t('sos.howItWorks')}
          </p>
        ) : null}
      </div>
    </main>
  )
}
