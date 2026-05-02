import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'
import { NetworkOfflineBanner } from '@/components/NetworkOfflineBanner'
import {
  getHospitalInbox,
  postAuthLogout,
  postHospitalAck,
  postHospitalResolve,
  postHospitalSession,
  setHospitalPortalToken,
  type HospitalInboxItem,
} from '@/services/api'

const LS_HOSP_TOKEN = 'mamaalert_hospital_portal_token'

export function HospitalInbox() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()

  const initialToken = useMemo(() => {
    const q = searchParams.get('token')
    if (q && q.length > 20) {
      return q
    }
    const ls = localStorage.getItem(LS_HOSP_TOKEN)
    if (ls && ls.length > 20) {
      return ls
    }
    return ''
  }, [searchParams])

  const [tokenInput, setTokenInput] = useState(initialToken)
  const [savedToken, setSavedToken] = useState(initialToken)
  const [cookieReady, setCookieReady] = useState(false)
  const [items, setItems] = useState<HospitalInboxItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const q = searchParams.get('token')
    if (q && q.length > 20) {
      setTokenInput(q)
      setSavedToken(q)
      void postHospitalSession(q)
        .then(() => {
          localStorage.removeItem(LS_HOSP_TOKEN)
          setHospitalPortalToken(null)
          setCookieReady(true)
          window.history.replaceState(null, '', window.location.pathname)
        })
        .catch((e: unknown) => setError(e instanceof Error ? e.message : t('common.error')))
    }
  }, [searchParams, t])

  useEffect(() => {
    if (initialToken.length > 20) {
      const q = searchParams.get('token')
      if (!q) {
        void postHospitalSession(initialToken)
          .then(() => {
            localStorage.removeItem(LS_HOSP_TOKEN)
            setHospitalPortalToken(null)
            setCookieReady(true)
          })
          .catch(() => {
            /* keep legacy bearer fallback */
          })
      }
      return
    }
    void postHospitalSession()
      .then(() => setCookieReady(true))
      .catch(() => {
        /* no existing cookie session */
      })
  }, [initialToken, searchParams])

  useEffect(() => {
    if (!cookieReady && savedToken.length > 20) {
      setHospitalPortalToken(savedToken)
    }
  }, [cookieReady, savedToken])

  const saveToken = useCallback(() => {
    const t = tokenInput.trim()
    if (t.length > 20) {
      void postHospitalSession(t)
        .then(() => {
          localStorage.removeItem(LS_HOSP_TOKEN)
          setSavedToken(t)
          setHospitalPortalToken(null)
          setCookieReady(true)
        })
        .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Invalid portal token'))
    }
  }, [tokenInput])

  const sessionReady = cookieReady || savedToken.length > 20

  const load = useCallback(async () => {
    if (!sessionReady) {
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await getHospitalInbox()
      setItems(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setLoading(false)
    }
  }, [sessionReady, t])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const id = window.setInterval(() => void load(), 12_000)
    return () => window.clearInterval(id)
  }, [load])

  if (!sessionReady) {
    return (
      <main id="main-content" tabIndex={-1} className="mx-auto max-w-lg space-y-4 p-6 outline-none">
        <NetworkOfflineBanner variant="liveData" />
        <h1 className="text-2xl font-bold">{t('hospital.title')}</h1>
        <p className="text-muted-foreground text-sm">
          {t('hospital.portalTokenHelp')}
        </p>
        <div className="space-y-3 rounded-lg border p-4">
          <Label htmlFor="hosp-token">{t('hospital.portalTokenLabel')}</Label>
          <Input
            id="hosp-token"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            autoComplete="off"
            className="font-mono text-xs"
          />
          <Button type="button" className="w-full" onClick={saveToken}>
            {t('common.save')}
          </Button>
        </div>
      </main>
    )
  }

  return (
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-lg space-y-4 p-6 outline-none">
      <NetworkOfflineBanner variant="liveDataSms" />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{t('hospital.title')}</h1>
        <div className="flex items-center gap-2">
          <Badge variant="destructive">{t('hospital.countBadge', { n: items.length })}</Badge>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              localStorage.removeItem(LS_HOSP_TOKEN)
              setHospitalPortalToken(null)
              setSavedToken('')
              setTokenInput('')
              setCookieReady(false)
              void postAuthLogout()
            }}
          >
            {t('auth.signOut')}
          </Button>
        </div>
      </div>

      {error ? <ErrorMessage message={error} onRetry={() => void load()} /> : null}
      {loading && items.length === 0 ? <LoadingSpinner variant="inline" /> : null}

      {items.length === 0 && !loading ? (
        <p className="text-muted-foreground text-center text-sm">{t('hospital.empty')}</p>
      ) : null}

      <div className="space-y-4">
        {items.map((it) => (
          <Card key={it.alertId}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{it.patientName}</CardTitle>
              <p className="text-muted-foreground text-sm">
                {it.weeksPregnant !== null ? t('sos.weeks', { n: it.weeksPregnant }) : ''}
                {it.bloodType ? ` · ${it.bloodType}` : ''}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-1">
                {it.riskFlags.map((r) => (
                  <Badge key={r} variant="destructive" className="text-xs">
                    {r}
                  </Badge>
                ))}
              </div>
              <p className="text-sm">
                {it.volunteerName
                  ? t('hospital.volunteerTransport', { name: it.volunteerName })
                  : t('hospital.awaitingVolunteer')}
              </p>
              <p className="text-muted-foreground text-sm">{t('hospital.eta', { n: it.etaMinutes })}</p>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button
                  type="button"
                  className="flex-1 bg-green-600 text-white hover:bg-green-700"
                  onClick={() => void postHospitalAck(it.alertId, 'ready').then(() => void load())}
                >
                  {t('hospital.ready')}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1 bg-amber-500 text-white hover:bg-amber-600"
                  onClick={() => void postHospitalAck(it.alertId, 'more_info').then(() => void load())}
                >
                  {t('hospital.moreInfo')}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  className="flex-1"
                  onClick={() => void postHospitalResolve(it.alertId).then(() => void load())}
                >
                  {t('hospital.markResolved')}
                </Button>
              </div>
              <p className="text-muted-foreground text-xs">{t('hospital.markResolvedHint')}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  )
}
