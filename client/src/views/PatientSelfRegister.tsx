import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MapView } from '@/components/MapView'
import { ErrorMessage } from '@/components/ErrorMessage'
import { useGeolocation } from '@/hooks/useGeolocation'
import { getPublicZones, postPatientSelfRegister, type PublicZoneRow } from '@/services/api'

const langs = ['en', 'hi', 'fr', 'sw', 'ar', 'pt'] as const
const relationshipValues = ['husband', 'mother', 'sister', 'neighbour', 'other'] as const

function normalizePhoneInput(value: string): string {
  const trimmed = value.replace(/[^\d+\s()-]/g, '')
  const withPlus = trimmed.startsWith('00') ? `+${trimmed.slice(2)}` : trimmed
  return withPlus.replace(/\s+/g, ' ').trim()
}

export function PatientSelfRegister() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { lat, lng, error: geoErr, isLoading: geoLoading, capture: captureLocation } = useGeolocation()
  const [regMode, setRegMode] = useState<'minimal' | 'full'>('minimal')
  const [zones, setZones] = useState<PublicZoneRow[]>([])
  const [zonesErr, setZonesErr] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [village, setVillage] = useState('')
  const [zoneId, setZoneId] = useState('')
  const [language, setLanguage] = useState<(typeof langs)[number]>('en')
  const [weeks, setWeeks] = useState('')
  const [c1Name, setC1Name] = useState('')
  const [c1Phone, setC1Phone] = useState('')
  const [c1Rel, setC1Rel] = useState<(typeof relationshipValues)[number]>('husband')
  const [submitErr, setSubmitErr] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const z = await getPublicZones()
        if (!cancelled) {
          setZones(z)
        }
      } catch {
        if (!cancelled) {
          setZonesErr(t('sos.selfReg.zonesError'))
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [t])

  const submit = useCallback(async () => {
    setSubmitErr(null)
    const n = name.trim()
    const p = normalizePhoneInput(phone).replace(/\s/g, '')
    const v = village.trim()
    if (n.length < 1) {
      setSubmitErr(t('register.validation.required'))
      return
    }
    if (p.length < 8 || !/^\+?[0-9]{8,20}$/.test(p)) {
      setSubmitErr(t('worker.volunteerReg.phoneInvalid'))
      return
    }
    if (!zoneId) {
      setSubmitErr(t('sos.selfReg.pickZone'))
      return
    }

    const wn = weeks.trim() ? Number(weeks) : null
    const weeks_pregnant =
      wn !== null && !Number.isNaN(wn) && wn >= 1 && wn <= 44 ? wn : null

    if (regMode === 'minimal') {
      if (v.length < 1) {
        setSubmitErr(t('sos.selfReg.villageRequired'))
        return
      }
      setSubmitting(true)
      try {
        const out = await postPatientSelfRegister({
          name: n,
          phone_primary: p,
          zone_id: zoneId,
          language,
          weeks_pregnant,
          village: v,
          emergency_contacts: [],
        })
        try {
          localStorage.setItem('mamaalert_sos_token', out.sos_token)
          localStorage.setItem('mamaalert_patient_phone', p)
          localStorage.setItem('mamaalert_patient_display_name', n.split(/\s+/)[0] ?? n)
          if (weeks_pregnant !== null) {
            localStorage.setItem('mamaalert_patient_weeks', String(weeks_pregnant))
          }
        } catch {
          /* storage */
        }
        const u = new URL(`${window.location.origin}/sos`)
        u.searchParams.set('token', out.sos_token)
        u.searchParams.set('phone', p)
        navigate(`${u.pathname}${u.search}`, { replace: true })
      } catch (e) {
        setSubmitErr(e instanceof Error ? e.message : t('common.error'))
      } finally {
        setSubmitting(false)
      }
      return
    }

    if (lat === null || lng === null) {
      setSubmitErr(t('register.locationRequired'))
      return
    }
    if (!c1Name.trim() || c1Phone.trim().length < 8) {
      setSubmitErr(t('sos.selfReg.contactRequired'))
      return
    }

    setSubmitting(true)
    try {
      const out = await postPatientSelfRegister({
        name: n,
        phone_primary: p,
        zone_id: zoneId,
        lat,
        lng,
        language,
        weeks_pregnant,
        emergency_contacts: [{ name: c1Name.trim(), phone: c1Phone.trim(), relationship: c1Rel }],
        ...(v.length > 0 ? { village: v } : {}),
      })
      try {
        localStorage.setItem('mamaalert_sos_token', out.sos_token)
        localStorage.setItem('mamaalert_patient_phone', p)
        localStorage.setItem('mamaalert_patient_display_name', n.split(/\s+/)[0] ?? n)
        if (weeks_pregnant !== null) {
          localStorage.setItem('mamaalert_patient_weeks', String(weeks_pregnant))
        }
      } catch {
        /* storage */
      }
      const u = new URL(`${window.location.origin}/sos`)
      u.searchParams.set('token', out.sos_token)
      u.searchParams.set('phone', p)
      navigate(`${u.pathname}${u.search}`, { replace: true })
    } catch (e) {
      setSubmitErr(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setSubmitting(false)
    }
  }, [
    c1Name,
    c1Phone,
    c1Rel,
    lat,
    lng,
    language,
    name,
    navigate,
    phone,
    regMode,
    t,
    village,
    weeks,
    zoneId,
  ])

  return (
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-lg space-y-6 p-6 pb-24 outline-none">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{t('sos.selfReg.title')}</h1>
        <Link to="/sos" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
          {t('sos.selfReg.back')}
        </Link>
      </div>
      <p className="text-muted-foreground text-sm">{t('sos.selfReg.subtitle')}</p>

      <div className="space-y-2 rounded-lg border border-border p-4">
        <p className="text-sm font-medium">{t('sos.selfReg.registrationType')}</p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={regMode === 'minimal' ? 'default' : 'outline'}
            onClick={() => setRegMode('minimal')}
          >
            {t('sos.selfReg.modeMinimal')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={regMode === 'full' ? 'default' : 'outline'}
            onClick={() => setRegMode('full')}
          >
            {t('sos.selfReg.modeFull')}
          </Button>
        </div>
        {regMode === 'minimal' ? (
          <p className="text-muted-foreground text-xs">{t('sos.selfReg.minimalHint')}</p>
        ) : null}
      </div>

      {zonesErr ? <ErrorMessage message={zonesErr} onRetry={() => window.location.reload()} /> : null}
      {submitErr ? <ErrorMessage message={submitErr} onRetry={() => setSubmitErr(null)} /> : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('register.sections.identity')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sr-name">{t('register.fields.name')}</Label>
            <Input id="sr-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sr-phone">{t('register.fields.phonePrimary')}</Label>
            <Input
              id="sr-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(normalizePhoneInput(e.target.value))}
              autoComplete="tel"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sr-zone">{t('sos.selfReg.zoneLabel')}</Label>
            <Select value={zoneId} onValueChange={(v) => setZoneId(v ?? '')}>
              <SelectTrigger id="sr-zone">
                <SelectValue placeholder={t('sos.selfReg.zonePlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {zones.map((z) => (
                  <SelectItem key={z.id} value={z.id}>
                    {z.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sr-lang">{t('register.fields.language')}</Label>
            <Select value={language} onValueChange={(v) => setLanguage(v as (typeof langs)[number])}>
              <SelectTrigger id="sr-lang">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {langs.map((l) => (
                  <SelectItem key={l} value={l}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sr-weeks">{t('register.fields.weeksPregnant')}</Label>
            <Input id="sr-weeks" type="number" min={1} max={44} value={weeks} onChange={(e) => setWeeks(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sr-village">{t('sos.selfReg.villageLabel')}</Label>
            <Input
              id="sr-village"
              value={village}
              onChange={(e) => setVillage(e.target.value)}
              placeholder={t('sos.selfReg.villagePlaceholder')}
              autoComplete="address-level3"
            />
          </div>
        </CardContent>
      </Card>

      {regMode === 'full' ? (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('register.sections.contacts')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground text-xs">{t('sos.selfReg.contactHint')}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="sr-c1n">{t('register.fields.contactName')}</Label>
              <Input id="sr-c1n" value={c1Name} onChange={(e) => setC1Name(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sr-c1p">{t('register.fields.contactPhone')}</Label>
              <Input id="sr-c1p" type="tel" value={c1Phone} onChange={(e) => setC1Phone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('register.fields.relationship')}</Label>
              <Select value={c1Rel} onValueChange={(v) => setC1Rel(v as (typeof relationshipValues)[number])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {relationshipValues.map((r) => (
                    <SelectItem key={r} value={r}>
                      {t(`register.relationship.${r}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      ) : null}

      {regMode === 'full' ? (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('register.sections.location')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button type="button" variant="secondary" disabled={geoLoading} onClick={captureLocation}>
            {geoLoading ? t('common.loading') : t('register.captureLocation')}
          </Button>
          {geoErr ? <p className="text-destructive text-sm">{geoErr}</p> : null}
          {lat !== null && lng !== null ? (
            <>
              <p className="text-muted-foreground text-sm">
                {lat.toFixed(5)}, {lng.toFixed(5)}
              </p>
              <MapView
                center={[lat, lng]}
                zoom={14}
                patients={[{ id: 'sr-cap', name: '', lat, lng }]}
                className="h-40 w-full rounded-md"
              />
            </>
          ) : null}
        </CardContent>
      </Card>
      ) : null}

      <Button type="button" className="w-full" size="lg" disabled={submitting || zones.length === 0} onClick={() => void submit()}>
        {submitting ? t('common.loading') : t('sos.selfReg.submit')}
      </Button>
    </main>
  )
}
