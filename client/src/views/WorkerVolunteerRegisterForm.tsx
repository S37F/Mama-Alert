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
  const [language, setLanguage] = useState<(typeof langs)[number]>('en')
  const [vehicle, setVehicle] = useState<(typeof vehicles)[number]>('none')
  const [submitErr, setSubmitErr] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [doneId, setDoneId] = useState<string | null>(null)

  if (!zoneId) {
    return (
      <p className="text-muted-foreground text-sm">{t('worker.noZoneVolunteers')}</p>
    )
  }

  const reset = () => {
    setName('')
    setPhone('')
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
    if (n.length < 1) {
      setSubmitErr(t('register.validation.required'))
      return
    }
    if (p.length < 8) {
      setSubmitErr(t('worker.volunteerReg.phoneInvalid'))
      return
    }
    setSubmitting(true)
    try {
      const out = await postRegisterVolunteer({
        name: n,
        phone: p,
        lat,
        lng,
        vehicle,
        language,
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
      <div className="space-y-3 rounded-md border border-border p-4">
        <p className="text-sm font-medium text-foreground">{t('worker.volunteerReg.success')}</p>
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
