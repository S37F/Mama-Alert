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
import { postPatientHints, postSos } from '@/services/api'

const LS_PHONE = 'mamaalert_patient_phone'
const LS_NAME = 'mamaalert_patient_display_name'
const LS_WEEKS = 'mamaalert_patient_weeks'
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

export function PatientSOS() {
  const { t, i18n } = useTranslation()
  const [searchParams] = useSearchParams()
  const { addToQueue, processPending } = useOfflineQueue()

  const [manualPhone, setManualPhone] = useState('')

  const storedPhone = useMemo(() => {
    const q = searchParams.get('phone')
    if (q && q.trim().length >= 8) {
      return q.trim()
    }
    return localStorage.getItem(LS_PHONE) ?? ''
  }, [searchParams])

  const effectivePhone = manualPhone.trim().length >= 8 ? manualPhone.trim() : storedPhone

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
    if (p && p.trim().length >= 8) {
      localStorage.setItem(LS_PHONE, p.trim())
    }
    if (n && n.trim().length > 0) {
      localStorage.setItem(LS_NAME, n.trim())
    }
    if (w && /^\d+$/.test(w)) {
      localStorage.setItem(LS_WEEKS, w)
    }
  }, [searchParams])

  useEffect(() => {
    if (effectivePhone.length < 8) {
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
  }, [effectivePhone])

  useEffect(() => {
    const apiBase = import.meta.env.VITE_API_URL ?? ''
    if (effectivePhone.length < 8 || apiBase.length === 0) {
      return
    }
    let cancelled = false
    void (async () => {
      const hints = await postPatientHints(effectivePhone)
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
  }, [effectivePhone, i18n])

  const [status, setStatus] = useState<SosVisualStatus>('idle')
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
    const p = manualPhone.trim()
    if (p.length >= 8) {
      localStorage.setItem(LS_PHONE, p)
    }
  }, [manualPhone])

  const triggerSos = useCallback(async () => {
    if (effectivePhone.length < 8) {
      setStatus('error')
      return
    }

    const payload = { phone: effectivePhone, triggerMethod: 'pwa' as const }

    if (!isOnline) {
      await addToQueue(payload)
      setStatus('offline')
      return
    }

    setStatus('sending')
    try {
      await postSos(payload)
      setStatus('sent')
    } catch {
      try {
        await addToQueue(payload)
        setStatus('offline')
      } catch {
        setStatus('error')
      }
    }
  }, [addToQueue, effectivePhone, isOnline])

  const missingPhone = effectivePhone.length < 8

  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-background">
      <div className="absolute right-3 top-3 z-10">
        <DropdownMenu>
          <DropdownMenuTrigger
            type="button"
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'text-xs')}
          >
            {t('sos.language')}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {LANGS.map((l) => (
              <DropdownMenuItem key={l.code} onClick={() => void i18n.changeLanguage(l.code)}>
                {l.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 pb-12 pt-16">
        <div className="text-center">
          <p className="text-3xl font-semibold tracking-tight md:text-4xl">
            {t('sos.greeting', { name: displayName })}
          </p>
          {weeksPregnant !== null ? (
            <p className="text-muted-foreground mt-2 text-xl">{t('sos.weeks', { n: weeksPregnant })}</p>
          ) : null}
          {!isOnline ? (
            <p className="text-muted-foreground mt-3 text-sm" role="status" aria-live="polite">
              {t('sos.networkOfflineHint')}
            </p>
          ) : null}
        </div>

        {missingPhone ? (
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
              onChange={(e) => setManualPhone(e.target.value)}
              placeholder={t('sos.phonePlaceholder')}
            />
            <Button type="button" className="w-full" onClick={persistPhone}>
              {t('sos.savePhone')}
            </Button>
          </div>
        ) : null}

        {!missingPhone ? (
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

        {status === 'offline' ? (
          <p className="text-muted-foreground max-w-sm text-center text-sm">{t('sos.offlineSubtext')}</p>
        ) : null}

        {status === 'sent' ? (
          <p className="text-muted-foreground max-w-sm text-center text-sm">{t('sos.sentDetail')}</p>
        ) : null}
      </div>
    </div>
  )
}
