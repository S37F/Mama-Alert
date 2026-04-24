import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
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
import { postRegisterVolunteer } from '@/services/api'

const langs = ['en', 'hi', 'fr', 'sw', 'ar', 'pt'] as const
const vehicles = ['none', 'motorcycle', 'car', 'ambulance'] as const

function parseSkillsCsv(raw: string): string[] {
  return raw
    .split(/[,;]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .slice(0, 12)
}

interface WorkerVolunteerRegisterFormProps {
  /** When absent, form shows a message instead of inputs. */
  zoneId: string | null
  onRegistered?: () => void
}

export function WorkerVolunteerRegisterForm({ zoneId, onRegistered }: WorkerVolunteerRegisterFormProps) {
  const { t } = useTranslation()
  const { lat, lng, error: geoErr, isLoading: geoLoading, capture: captureLocation } = useGeolocation()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [village, setVillage] = useState('')
  const [skillsCsv, setSkillsCsv] = useState('')
  const [hours, setHours] = useState('')
  const [maxRadius, setMaxRadius] = useState('5')
  const [language, setLanguage] = useState<(typeof langs)[number]>('en')
  const [vehicle, setVehicle] = useState<(typeof vehicles)[number]>('none')
  const [submitErr, setSubmitErr] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [doneId, setDoneId] = useState<string | null>(null)

  if (!zoneId) {
    return <p className="text-muted-foreground text-sm">{t('worker.noZoneVolunteers')}</p>
  }

  const reset = () => {
    setName('')
    setPhone('')
    setVillage('')
    setSkillsCsv('')
    setHours('')
    setMaxRadius('5')
    setLanguage('en')
    setVehicle('none')
    setDoneId(null)
    setSubmitErr(null)
  }

  const submit = async () => {
    setSubmitErr(null)
    if (lat === null || lng === null) {
      setSubmitErr(t('register.locationRequired'))
      return
    }
    const n = name.trim()
    const p = phone.trim()
    const v = village.trim()
    if (n.length < 1) {
      setSubmitErr(t('register.validation.required'))
      return
    }
    if (p.length < 8) {
      setSubmitErr(t('worker.volunteerReg.phoneInvalid'))
      return
    }
    if (v.length < 1) {
      setSubmitErr(t('worker.volunteerReg.villageRequired'))
      return
    }
    const radiusN = Number.parseInt(maxRadius, 10)
    const max_radius_km =
      Number.isFinite(radiusN) && radiusN >= 1 && radiusN <= 100 ? radiusN : 5

    setSubmitting(true)
    try {
      const skills = parseSkillsCsv(skillsCsv)
      const out = await postRegisterVolunteer({
        name: n,
        phone: p,
        lat,
        lng,
        village: v,
        vehicle,
        max_radius_km,
        language,
        ...(skills.length > 0 ? { skills } : {}),
        ...(hours.trim() ? { availability_hours: hours.trim() } : {}),
      })
      setDoneId(out.id)
      onRegistered?.()
    } catch (e) {
      setSubmitErr(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setSubmitting(false)
    }
  }

  if (doneId) {
    return (
      <div className="mama-panel-compact space-y-3 p-4">
        <p className="text-sm font-medium text-foreground">{t('worker.volunteerReg.success')}</p>
        <p className="text-muted-foreground text-sm">{t('worker.volunteerReg.welcomeSmsHint')}</p>
        <p className="text-muted-foreground font-mono text-xs">{doneId}</p>
        <Button type="button" variant="outline" size="sm" onClick={reset}>
          {t('worker.volunteerReg.registerAnother')}
        </Button>
      </div>
    )
  }

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t('worker.volunteerReg.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {submitErr ? <ErrorMessage message={submitErr} onRetry={() => setSubmitErr(null)} /> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="vol-name">{t('register.fields.name')}</Label>
            <Input id="vol-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vol-phone">{t('register.fields.phonePrimary')}</Label>
            <Input id="vol-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="vol-village">{t('register.fields.village')}</Label>
            <Input
              id="vol-village"
              value={village}
              onChange={(e) => setVillage(e.target.value)}
              placeholder={t('worker.volunteerReg.villagePlaceholder')}
              autoComplete="address-level3"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="vol-skills">{t('worker.volunteerReg.skillsLabel')}</Label>
            <Input
              id="vol-skills"
              value={skillsCsv}
              onChange={(e) => setSkillsCsv(e.target.value)}
              placeholder={t('worker.volunteerReg.skillsPlaceholder')}
            />
            <p className="text-muted-foreground text-xs">{t('worker.volunteerReg.skillsHint')}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="vol-radius">{t('worker.volunteerReg.radiusKm')}</Label>
            <Input
              id="vol-radius"
              type="number"
              min={1}
              max={100}
              value={maxRadius}
              onChange={(e) => setMaxRadius(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vol-vehicle">{t('admin.vehicle')}</Label>
            <Select value={vehicle} onValueChange={(v) => setVehicle(v as (typeof vehicles)[number])}>
              <SelectTrigger id="vol-vehicle">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="vol-hours">{t('worker.volunteerReg.hoursLabel')}</Label>
            <Input
              id="vol-hours"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder={t('worker.volunteerReg.hoursPlaceholder')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vol-lang">{t('register.fields.language')}</Label>
            <Select value={language} onValueChange={(v) => setLanguage(v as (typeof langs)[number])}>
              <SelectTrigger id="vol-lang">
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
        </div>
        <div className="space-y-2">
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
                patients={[{ id: 'vol-capture', name: '', lat, lng }]}
                className="h-40 w-full rounded-md"
              />
            </>
          ) : null}
        </div>
        <Button type="button" className="w-full sm:w-auto" disabled={submitting} onClick={() => void submit()}>
          {submitting ? t('common.loading') : t('worker.volunteerReg.submit')}
        </Button>
      </CardContent>
    </Card>
  )
}
