import { useCallback, useEffect, useMemo, useState } from 'react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { BrandLogo } from '@/components/BrandLogo'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSignup } from '@/hooks/useSignup'
import { cn } from '@/lib/utils'
import { SOSButton, type SosVisualStatus } from '@/components/SOSButton'
import { useOfflineQueue } from '@/hooks/useOfflineQueue'
import {
  ApiHttpError,
  getPatientVolunteersNearbyCount,
  postPatientHints,
  postSos,
  postSosPatientInteraction,
} from '@/services/api'

const LS_PHONE = 'mamaalert_patient_phone'
const LS_NAME = 'mamaalert_patient_display_name'
const LS_WEEKS = 'mamaalert_patient_weeks'
const LS_SOS_TOKEN = 'mamaalert_sos_token'
const LS_NOTIF_PROMPTED = 'mamaalert_notifications_prompted_v1'
const LS_ONBOARDING = 'mamaalert_patient_onboarding_v1'
const ONBOARDING_STEP_COUNT = 3

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

function PhoneLoginPanel({
  onBack,
  t,
  countryHint,
}: {
  onBack: () => void
  t: TFunction
  countryHint: string
}) {
  const { loginWithPhone, isSubmitting, error, clearError } = useSignup()
  const [phone, setPhone] = useState('')
  const [localErr, setLocalErr] = useState<string | null>(null)

  const compactPhone = () => normalizePhoneInput(phone).replace(/\s/g, '')

  const submit = async () => {
    setLocalErr(null)
    const p = compactPhone()
    if (p.length < 8) {
      setLocalErr(t('sos.access.phoneInvalid'))
      return
    }
    try {
      await loginWithPhone(p)
    } catch {
      /* handled by hook state */
    }
  }

  return (
    <div className="mama-panel-compact w-full max-w-sm space-y-4 p-4">
      <Button type="button" variant="ghost" size="sm" className="px-0" onClick={onBack}>
        {t('sos.access.back')}
      </Button>
      <p className="text-muted-foreground text-sm">{t('sos.access.phoneHelp', { dialCode: countryHint })}</p>
      <div className="space-y-2">
        <Label htmlFor="login-phone">{t('sos.phoneLabel')}</Label>
        <Input
          id="login-phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => {
            setPhone(normalizePhoneInput(e.target.value))
            clearError()
          }}
          placeholder={countryHint}
        />
      </div>
      <Button type="button" className="w-full" disabled={isSubmitting} onClick={() => void submit()}>
        {isSubmitting ? t('common.loading') : t('sos.access.continue')}
      </Button>
      {localErr || error ? <p className="text-destructive text-center text-sm">{localErr ?? error}</p> : null}
    </div>
  )
}

function OnboardingVolunteerStep({ sosToken, t }: { sosToken: string; t: TFunction }) {
  const [count, setCount] = useState<number | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const n = await getPatientVolunteersNearbyCount(sosToken)
        if (!cancelled) {
          setCount(n)
        }
      } catch {
        if (!cancelled) {
          setFailed(true)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [sosToken])

  if (failed) {
    return <p className="text-muted-foreground text-center text-base leading-relaxed">{t('sos.onboarding.volunteersUnknown')}</p>
  }
  if (count === null) {
    return <p className="text-muted-foreground text-center text-base leading-relaxed">{t('sos.onboarding.volunteersLoading')}</p>
  }
  const display = count >= 12 ? '12+' : String(count)
  return (
    <p className="text-muted-foreground text-center text-base leading-relaxed">
      {t('sos.onboarding.volunteersNear', { n: display })}
    </p>
  )
}

export function PatientSOS() {
  const { t, i18n } = useTranslation()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { addToQueue, processPending } = useOfflineQueue()

  const [manualPhone, setManualPhone] = useState('')
  const [showHowItWorks, setShowHowItWorks] = useState(false)
  const [locationPrompted, setLocationPrompted] = useState(false)

  const shortLinkPhone = useMemo(() => {
    const fromPhone = searchParams.get('phone')?.trim() ?? ''
    const fromSetup = searchParams.get('setup')?.trim() ?? ''
    const q = fromPhone.length >= 8 ? fromPhone : fromSetup.length >= 8 ? fromSetup : ''
    return q
  }, [searchParams])

  const storedPhone = useMemo(() => {
    if (shortLinkPhone) {
      return shortLinkPhone
    }
    return localStorage.getItem(LS_PHONE) ?? ''
  }, [shortLinkPhone])

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
    const setup = searchParams.get('setup')
    const n = searchParams.get('name')
    const w = searchParams.get('weeks')
    const tok = searchParams.get('token')
    const phoneLike = p && p.trim().length >= 8 ? p.trim() : setup && setup.trim().length >= 8 ? setup.trim() : ''
    if (phoneLike) {
      localStorage.setItem(LS_PHONE, phoneLike)
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
  const phoneOnlyShortLink = Boolean(shortLinkPhone && missingToken)

  useEffect(() => {
    if (missingToken && !shortLinkPhone) {
      navigate('/sos/register', { replace: true })
    }
  }, [missingToken, shortLinkPhone, navigate])

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

  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboardingStep, setOnboardingStep] = useState(1)
  const [accessMode, setAccessMode] = useState<'menu' | 'phone'>('menu')

  useEffect(() => {
    if (!missingToken) {
      setAccessMode('menu')
    }
  }, [missingToken])

  useEffect(() => {
    if (missingToken) {
      setShowOnboarding(false)
      return
    }
    try {
      setShowOnboarding(localStorage.getItem(LS_ONBOARDING) !== '1')
    } catch {
      setShowOnboarding(false)
    }
  }, [missingToken])

  const finishOnboarding = useCallback(() => {
    try {
      localStorage.setItem(LS_ONBOARDING, '1')
    } catch {
      /* private mode / quota */
    }
    setShowOnboarding(false)
  }, [])

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

  useEffect(() => {
    const flushQueueWhenVisible = () => {
      if (document.visibilityState === 'visible' && typeof navigator !== 'undefined' && navigator.onLine) {
        void processPending()
      }
    }
    document.addEventListener('visibilitychange', flushQueueWhenVisible)
    window.addEventListener('pageshow', flushQueueWhenVisible)
    return () => {
      document.removeEventListener('visibilitychange', flushQueueWhenVisible)
      window.removeEventListener('pageshow', flushQueueWhenVisible)
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
      const out = await postSos(payload)
      setDuplicateCooldown(Boolean(out.duplicate))
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

  if (!missingToken && showOnboarding) {
    const titleKey =
      onboardingStep === 1
        ? 'sos.onboarding.step1Title'
        : onboardingStep === 2
          ? 'sos.onboarding.step2Title'
          : 'sos.onboarding.step3Title'
    return (
    <main id="main-content" tabIndex={-1} className="mama-page flex min-h-[100dvh] flex-col px-4 py-12 outline-none">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6">
          <div className="flex justify-center">
            <BrandLogo size="sm" tone="light" animated />
          </div>
          <p className="text-muted-foreground text-center text-sm">
            {t('sos.onboarding.stepCounter', { current: onboardingStep, total: ONBOARDING_STEP_COUNT })}
          </p>
          <h1 className="mama-heading text-center text-2xl">{t(titleKey)}</h1>
          {onboardingStep === 1 ? (
            <>
              <p className="text-muted-foreground text-center text-base leading-relaxed">{t('sos.onboarding.step1Body')}</p>
              <div className="flex justify-center py-2">
                <SOSButton preview status="idle" onTrigger={async () => {}} />
              </div>
            </>
          ) : null}
          {onboardingStep === 2 ? (
            <>
              <p className="text-muted-foreground text-center text-base leading-relaxed">{t('sos.onboarding.step2Intro')}</p>
              <OnboardingVolunteerStep sosToken={sosToken} t={t} />
            </>
          ) : null}
          {onboardingStep === 3 ? (
            <p className="text-muted-foreground text-center text-base leading-relaxed">{t('sos.onboarding.step3Body')}</p>
          ) : null}
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            {onboardingStep > 1 ? (
              <Button type="button" variant="outline" onClick={() => setOnboardingStep((s) => s - 1)}>
                {t('sos.onboarding.back')}
              </Button>
            ) : null}
            {onboardingStep < ONBOARDING_STEP_COUNT ? (
              <Button type="button" onClick={() => setOnboardingStep((s) => s + 1)}>
                {t('sos.onboarding.next')}
              </Button>
            ) : (
              <Button type="button" onClick={finishOnboarding}>
                {t('sos.onboarding.start')}
              </Button>
            )}
          </div>
        </div>
      </main>
    )
  }

  return (
    <main id="main-content" tabIndex={-1} className="mama-page relative flex min-h-[100dvh] flex-col outline-none">
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {statusAnnouncement}
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] pt-16 text-base">
        <BrandLogo size="md" tone="light" animated />
        <div className="text-center">
          <h1 className="mama-heading text-3xl md:text-4xl">
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
          accessMode === 'menu' ? (
            phoneOnlyShortLink ? (
              <div className="mama-panel-compact w-full max-w-sm space-y-4 p-4">
                <h2 className="text-center text-lg font-semibold">{t('sos.shortLink.title')}</h2>
                <p className="text-muted-foreground text-center text-sm">{t('sos.shortLink.body')}</p>
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    className="w-full"
                    onClick={() => {
                      setManualPhone(shortLinkPhone)
                      setAccessMode('phone')
                    }}
                  >
                    {t('sos.shortLink.signInCta')}
                  </Button>
                  <Link
                    to="/sos/register"
                    className={cn(buttonVariants({ variant: 'secondary' }), 'inline-flex w-full items-center justify-center')}
                  >
                    {t('sos.access.selfRegister')}
                  </Link>
                </div>
              </div>
            ) : (
              <div className="mama-panel-compact w-full max-w-sm space-y-4 p-4">
                <p className="text-muted-foreground text-center text-sm">{t('sos.access.intro')}</p>
                <div className="flex flex-col gap-2">
                  <Button type="button" className="w-full" onClick={() => setAccessMode('phone')}>
                    {t('sos.access.signInPhone')}
                  </Button>
                  <Link
                    to="/sos/register"
                    className={cn(buttonVariants({ variant: 'secondary' }), 'inline-flex w-full items-center justify-center')}
                  >
                    {t('sos.access.selfRegister')}
                  </Link>
                </div>
                <div className="border-t border-border pt-3 text-center">
                  <Link
                    to="/demo"
                    className="text-sm text-primary underline-offset-2 hover:underline"
                  >
                    {t('sos.access.tryDemo')}
                  </Link>
                  <p className="text-muted-foreground mt-1 text-xs">{t('sos.access.demoHint')}</p>
                </div>
              </div>
            )
          ) : (
            <PhoneLoginPanel
              t={t}
              countryHint={countryHint}
              onBack={() => setAccessMode('menu')}
            />
          )
        ) : null}

        {!missingToken ? (
          <div className="mama-panel-compact w-full max-w-sm space-y-3 p-4">
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
            {!duplicateCooldown ? (
              <p className="text-muted-foreground text-xs">{t('sos.interactionHint')}</p>
            ) : null}
            {!duplicateCooldown ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() => {
                  void (async () => {
                    try {
                      await postSosPatientInteraction(sosToken)
                    } catch {
                      /* non-fatal */
                    }
                  })()
                }}
              >
                {t('sos.interactionCta')}
              </Button>
            ) : null}
            <Button type="button" variant="outline" size="sm" onClick={() => { setStatus('idle'); setDuplicateCooldown(false) }}>
              {t('sos.reset')}
            </Button>
          </div>
        ) : null}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 backdrop-blur mama-sos-footer-safe">
        <div className="mx-auto grid w-full max-w-md grid-cols-3 gap-2">
          <a
            href={`tel:${helpPhone}`}
            aria-label={t('a11y.callEmergency', { phone: helpPhone })}
            className={cn(
              buttonVariants({ variant: 'outline', size: 'default' }),
              'min-h-11 justify-center text-center text-sm font-semibold',
            )}
          >
            {t('sos.helpCall')}
          </a>
          <DropdownMenu>
            <DropdownMenuTrigger
              type="button"
              className={cn(
                buttonVariants({ variant: 'outline', size: 'default' }),
                'min-h-11 justify-center px-3 text-sm font-semibold',
              )}
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
            size="default"
            className="min-h-11 text-sm font-semibold"
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
