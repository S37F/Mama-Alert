import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BrandLogo } from '@/components/BrandLogo'
import { MapView } from '@/components/MapView'
import { ErrorMessage } from '@/components/ErrorMessage'
import { NetworkOfflineBanner } from '@/components/NetworkOfflineBanner'
import { useGeolocation } from '@/hooks/useGeolocation'
import { getPublicZones, postPatientSelfRegister, type PublicZoneRow } from '@/services/api'

const langs = ['en', 'hi', 'fr', 'sw', 'ar', 'pt'] as const
const relationshipValues = ['husband', 'mother', 'sister', 'neighbour', 'other'] as const

const riskKeys = [
  'pre_eclampsia',
  'placenta_previa',
  'severe_anaemia',
  'gestational_diabetes',
  'multiple_pregnancy',
  'obstructed_labour_history',
  'hiv_positive',
  'on_medication',
] as const

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'] as const

function normalizePhoneInput(value: string): string {
  const trimmed = value.replace(/[^\d+\s()-]/g, '')
  const withPlus = trimmed.startsWith('00') ? `+${trimmed.slice(2)}` : trimmed
  return withPlus.replace(/\s+/g, ' ').trim()
}

export function PatientSelfRegister() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { lat, lng, error: geoErr, isLoading: geoLoading, capture: captureLocation } = useGeolocation()
  const [zones, setZones] = useState<PublicZoneRow[]>([])
  const [zonesErr, setZonesErr] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [village, setVillage] = useState('')
  const [landmark, setLandmark] = useState('')
  const [pickedZoneId, setPickedZoneId] = useState('')
  const [zoneName, setZoneName] = useState('')
  const [language, setLanguage] = useState<(typeof langs)[number]>('en')
  const [weeks, setWeeks] = useState('')
  const [bloodType, setBloodType] = useState<(typeof BLOOD_TYPES)[number]>('O+')
  const [risk, setRisk] = useState<Record<(typeof riskKeys)[number], boolean>>(() =>
    Object.fromEntries(riskKeys.map((k) => [k, false])) as Record<(typeof riskKeys)[number], boolean>,
  )
  const [medicationName, setMedicationName] = useState('')
  const [c1Name, setC1Name] = useState('')
  const [c1Phone, setC1Phone] = useState('')
  const [c1Rel, setC1Rel] = useState<(typeof relationshipValues)[number]>('husband')
  const [c2Name, setC2Name] = useState('')
  const [c2Phone, setC2Phone] = useState('')
  const [c2Rel, setC2Rel] = useState<(typeof relationshipValues)[number]>('mother')
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
    if (n.length < 2) {
      setSubmitErr(t('register.validation.required'))
      return
    }
    if (p.length < 8 || !/^\+?[0-9]{8,20}$/.test(p)) {
      setSubmitErr(t('worker.volunteerReg.phoneInvalid'))
      return
    }
    const areaName = zoneName.trim()
    if (!pickedZoneId && areaName.length === 1) {
      setSubmitErr(t('sos.selfReg.zoneNameRequired'))
      return
    }
    const wn = Number(weeks)
    if (!Number.isFinite(wn) || wn < 1 || wn > 44) {
      setSubmitErr(t('sos.selfReg.weeksRequired'))
      return
    }
    if (lat === null || lng === null) {
      setSubmitErr(t('register.locationRequired'))
      return
    }
    if (v.length < 2) {
      setSubmitErr(t('sos.selfReg.villageRequired'))
      return
    }
    if (!c1Name.trim() || c1Phone.trim().length < 8) {
      setSubmitErr(t('sos.selfReg.contactRequired'))
      return
    }
    const c1Norm = normalizePhoneInput(c1Phone).replace(/\s/g, '')
    if (!/^\+?[0-9]{8,20}$/.test(c1Norm)) {
      setSubmitErr(t('worker.volunteerReg.phoneInvalid'))
      return
    }

    const c2Nx = c2Name.trim()
    const c2Px = normalizePhoneInput(c2Phone).replace(/\s/g, '')
    const hasC2Partial = Boolean(c2Nx || c2Px)
    if (hasC2Partial) {
      if (!c2Nx) {
        setSubmitErr(t('register.validation.required'))
        return
      }
      if (c2Px.length < 8 || !/^\+?[0-9]{8,20}$/.test(c2Px)) {
        setSubmitErr(t('worker.volunteerReg.phoneInvalid'))
        return
      }
    }

    const risk_flags = riskKeys.filter((k) => risk[k])
    if (risk.on_medication) {
      const med = medicationName.trim()
      if (med.length < 1) {
        setSubmitErr(t('register.validation.required'))
        return
      }
    }

    const emergency_contacts = [
      { name: c1Name.trim(), phone: c1Norm, relationship: c1Rel },
      ...(hasC2Partial ? [{ name: c2Nx, phone: c2Px, relationship: c2Rel }] : []),
    ]

    const landmarkTrim = landmark.trim()

    setSubmitting(true)
    try {
      const out = await postPatientSelfRegister({
        name: n,
        phone_primary: p,
        ...(pickedZoneId
          ? { zone_id: pickedZoneId }
          : areaName.length >= 2
            ? { zone_name: areaName }
            : {}),
        lat,
        lng,
        language,
        weeks_pregnant: wn,
        village: v,
        landmark: landmarkTrim.length > 0 ? landmarkTrim : null,
        blood_type: bloodType,
        risk_flags,
        medication_name: risk.on_medication ? medicationName.trim() : null,
        emergency_contacts,
      })
      try {
        localStorage.setItem('mamaalert_sos_token', out.sos_token)
        localStorage.setItem('mamaalert_patient_phone', p)
        localStorage.setItem('mamaalert_patient_display_name', n.split(/\s+/)[0] ?? n)
        localStorage.setItem('mamaalert_patient_weeks', String(wn))
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
    bloodType,
    c1Name,
    c1Phone,
    c1Rel,
    c2Name,
    c2Phone,
    c2Rel,
    landmark,
    lat,
    lng,
    language,
    medicationName,
    name,
    navigate,
    phone,
    risk,
    t,
    village,
    pickedZoneId,
    weeks,
    zoneName,
  ])

  return (
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-lg space-y-6 p-6 pb-24 outline-none">
      <NetworkOfflineBanner variant="formSubmit" />
      <BrandLogo size="sm" tone="light" animated />
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{t('sos.selfReg.title')}</h1>
        <Link to="/sos" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
          {t('sos.selfReg.back')}
        </Link>
      </div>
      <p className="text-muted-foreground text-sm">{t('sos.selfReg.subtitle')}</p>

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
            {zones.length > 0 ? (
              <>
                <Label htmlFor="sr-zone-pick">{t('sos.selfReg.zonePickLabel')}</Label>
                <select
                  id="sr-zone-pick"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={pickedZoneId}
                  onChange={(e) => {
                    const v = e.target.value
                    setPickedZoneId(v)
                    if (v) {
                      const z = zones.find((row) => row.id === v)
                      setZoneName(z?.name ?? '')
                    }
                  }}
                >
                  <option value="">{t('sos.selfReg.zonePickPlaceholder')}</option>
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name}
                    </option>
                  ))}
                </select>
              </>
            ) : null}
            <Label htmlFor="sr-zone-name">{t('sos.selfReg.zoneLabel')}</Label>
            <Input
              id="sr-zone-name"
              value={zoneName}
              onChange={(e) => setZoneName(e.target.value)}
              placeholder={t('sos.selfReg.zonePlaceholder')}
              autoComplete="off"
              disabled={Boolean(pickedZoneId)}
              readOnly={Boolean(pickedZoneId)}
            />
            <p className="text-muted-foreground text-xs">{t('sos.selfReg.zoneNameHint')}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sr-lang">{t('register.fields.language')}</Label>
            <Select value={language} onValueChange={(v) => setLanguage(v as (typeof langs)[number])}>
              <SelectTrigger id="sr-lang" className="w-full">
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
            <Label htmlFor="sr-weeks">{t('register.fields.weeksPregnant')} *</Label>
            <Input id="sr-weeks" type="number" min={1} max={44} value={weeks} onChange={(e) => setWeeks(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sr-blood">{t('register.fields.bloodType')}</Label>
            <Select value={bloodType} onValueChange={(v) => setBloodType(v as (typeof BLOOD_TYPES)[number])}>
              <SelectTrigger id="sr-blood" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BLOOD_TYPES.map((bt) => (
                  <SelectItem key={bt} value={bt}>
                    {bt === 'unknown' ? t('sos.selfReg.bloodUnknown') : bt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sr-village">{t('sos.selfReg.villageLabel')} *</Label>
            <Input
              id="sr-village"
              value={village}
              onChange={(e) => setVillage(e.target.value)}
              placeholder={t('sos.selfReg.villagePlaceholder')}
              autoComplete="address-level3"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sr-landmark">{t('register.fields.landmark')}</Label>
            <Input
              id="sr-landmark"
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              placeholder={t('sos.selfReg.landmarkPlaceholder')}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('register.sections.location')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-xs">{t('sos.selfReg.locationHint')}</p>
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('register.sections.risks')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {riskKeys.map((k) => (
            <div key={k} className="flex items-center gap-2">
              <Checkbox
                id={`sr-risk-${k}`}
                checked={risk[k]}
                onCheckedChange={(c) => setRisk((prev) => ({ ...prev, [k]: c === true }))}
              />
              <Label htmlFor={`sr-risk-${k}`} className="font-normal">
                {t(`register.risks.${k}`)}
              </Label>
            </div>
          ))}
          {risk.on_medication ? (
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="sr-med">{t('register.fields.medicationName')}</Label>
              <Input id="sr-med" value={medicationName} onChange={(e) => setMedicationName(e.target.value)} />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('register.sections.contacts')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground text-xs">{t('sos.selfReg.contactHint')}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>{t('register.contact.n', { n: 1 })}</Label>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="sr-c1n">{t('register.fields.contactName')}</Label>
              <Input id="sr-c1n" value={c1Name} onChange={(e) => setC1Name(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sr-c1p">{t('register.fields.contactPhone')}</Label>
              <Input
                id="sr-c1p"
                type="tel"
                value={c1Phone}
                onChange={(e) => setC1Phone(normalizePhoneInput(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('register.fields.relationship')}</Label>
              <Select value={c1Rel} onValueChange={(v) => setC1Rel(v as (typeof relationshipValues)[number])}>
                <SelectTrigger className="w-full">
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
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>
                {t('register.contact.n', { n: 2 })} {t('register.contact.optional')}
              </Label>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="sr-c2n">{t('register.fields.contactName')}</Label>
              <Input id="sr-c2n" value={c2Name} onChange={(e) => setC2Name(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sr-c2p">{t('register.fields.contactPhone')}</Label>
              <Input
                id="sr-c2p"
                type="tel"
                value={c2Phone}
                onChange={(e) => setC2Phone(normalizePhoneInput(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('register.fields.relationship')}</Label>
              <Select value={c2Rel} onValueChange={(v) => setC2Rel(v as (typeof relationshipValues)[number])}>
                <SelectTrigger className="w-full">
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

      <Button
        type="button"
        className="w-full"
        size="lg"
        disabled={submitting}
        onClick={() => void submit()}
      >
        {submitting ? t('common.loading') : t('sos.selfReg.submit')}
      </Button>
    </main>
  )
}
