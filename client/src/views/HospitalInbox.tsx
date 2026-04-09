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
import { getHospitalInbox, postHospitalAck, type HospitalInboxItem } from '@/services/api'

const LS_HOSP = 'mamaalert_hospital_id'

export function HospitalInbox() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const envId = import.meta.env.VITE_DEMO_HOSPITAL_ID as string | undefined

  const initialId = useMemo(() => {
    const q = searchParams.get('hospitalId')
    if (q && q.length > 8) {
      return q
    }
    const ls = localStorage.getItem(LS_HOSP)
    if (ls && ls.length > 8) {
      return ls
    }
    return envId && envId.length > 8 ? envId : ''
  }, [searchParams, envId])

  const [hospitalIdInput, setHospitalIdInput] = useState(initialId)
  const [hospitalId, setHospitalId] = useState(initialId)
  const [items, setItems] = useState<HospitalInboxItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const saveId = useCallback(() => {
    const id = hospitalIdInput.trim()
    if (id.length > 8) {
      localStorage.setItem(LS_HOSP, id)
      setHospitalId(id)
    }
  }, [hospitalIdInput])

  const load = useCallback(async () => {
    if (hospitalId.length < 8) {
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await getHospitalInbox(hospitalId)
      setItems(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setLoading(false)
    }
  }, [hospitalId, t])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const id = window.setInterval(() => void load(), 12_000)
    return () => window.clearInterval(id)
  }, [load])

  if (hospitalId.length < 8) {
    return (
      <main id="main-content" tabIndex={-1} className="mx-auto max-w-lg space-y-4 p-6 outline-none">
        <h1 className="text-2xl font-bold">{t('hospital.title')}</h1>
        <div className="space-y-3 rounded-lg border p-4">
          <Label htmlFor="hosp-id">{t('hospital.idLabel')}</Label>
          <Input id="hosp-id" value={hospitalIdInput} onChange={(e) => setHospitalIdInput(e.target.value)} />
          <Button type="button" className="w-full" onClick={saveId}>
            {t('common.save')}
          </Button>
        </div>
      </main>
    )
  }

  return (
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-lg space-y-4 p-6 outline-none">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{t('hospital.title')}</h1>
        <Badge variant="destructive">{t('hospital.countBadge', { n: items.length })}</Badge>
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
              <div className="flex flex-col gap-2 sm:flex-row">
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
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  )
}
