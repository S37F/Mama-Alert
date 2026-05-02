import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
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
import { getPublicZones, postClinicSelfRegister, setHospitalPortalToken, type PublicZoneRow } from '@/services/api'

const clinicTypes = ['clinic', 'health_center', 'hospital', 'maternity_home'] as const
type ClinicType = (typeof clinicTypes)[number]

const clinicTypeLabels: Record<ClinicType, string> = {
  clinic: 'Clinic / PHC',
  health_center: 'Health Center',
  hospital: 'Hospital',
  maternity_home: 'Maternity Home',
}

function normalizePhoneInput(value: string): string {
  const trimmed = value.replace(/[^\d+\s()-]/g, '')
  const withPlus = trimmed.startsWith('00') ? `+${trimmed.slice(2)}` : trimmed
  return withPlus.replace(/\s+/g, ' ').trim()
}

export function ClinicSelfRegister() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { lat, lng, error: geoErr, isLoading: geoLoading, capture: captureLocation } = useGeolocation()

  const [zones, setZones] = useState<PublicZoneRow[]>([])
  const [zonesErr, setZonesErr] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [clinicType, setClinicType] = useState<ClinicType>('clinic')
  const [pickedZoneId, setPickedZoneId] = useState('')
  const [zoneName, setZoneName] = useState('')
  const [is24hr, setIs24hr] = useState(false)

  const [submitErr, setSubmitErr] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<{ token: string; name: string } | null>(null)

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
          setZonesErr('Could not load zones')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const submit = useCallback(async () => {
    setSubmitErr(null)
    const n = name.trim()
    const p = normalizePhoneInput(phone).replace(/\s/g, '')

    if (n.length < 2) {
      setSubmitErr('Clinic name is required (at least 2 characters)')
      return
    }
    if (p.length < 8 || !/^\+?[0-9]{8,20}$/.test(p)) {
      setSubmitErr('Please enter a valid phone number')
      return
    }
    const areaName = zoneName.trim()
    if (!pickedZoneId && areaName.length === 1) {
      setSubmitErr('Program / area name is too short. Use at least two characters, pick from the list, or leave blank if your coordinator set a server default.')
      return
    }
    if (lat === null || lng === null) {
      setSubmitErr('Please share your location')
      return
    }

    setSubmitting(true)
    try {
      const result = await postClinicSelfRegister({
        name: n,
        phone: p,
        type: clinicType,
        lat,
        lng,
        ...(pickedZoneId
          ? { zone_id: pickedZoneId }
          : areaName.length >= 2
            ? { zone_name: areaName }
            : {}),
        is_24hr: is24hr,
      })

      localStorage.setItem('mamaalert_hospital_portal_token', result.portal_token)
      setHospitalPortalToken(result.portal_token)
      setSuccess({ token: result.portal_token, name: result.name })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Registration failed'
      setSubmitErr(msg)
    } finally {
      setSubmitting(false)
    }
  }, [name, phone, clinicType, pickedZoneId, zoneName, lat, lng, is24hr])

  if (success) {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="mama-page flex min-h-screen flex-col items-center justify-center px-4 py-8 outline-none"
      >
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <BrandLogo tone="light" size="md" className="justify-center" />
            <CardTitle className="mt-4 text-2xl text-green-700">Registration Complete!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-muted-foreground">
              <strong>{success.name}</strong> is now registered in the MamaAlert network.
            </p>
            <div className="rounded-lg border bg-secondary/50 p-4">
              <p className="text-sm font-medium">Your Portal Token (save this!):</p>
              <p className="mt-2 break-all font-mono text-xs">{success.token}</p>
            </div>
            <p className="text-center text-sm text-muted-foreground">
              You'll receive SMS alerts when patients are heading to your facility.
            </p>
            <Button
              type="button"
              className="w-full"
              onClick={() => navigate('/hospital')}
            >
              Open Clinic Inbox
            </Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mama-page flex min-h-screen flex-col items-center px-4 py-8 outline-none"
    >
      <NetworkOfflineBanner variant="formSubmit" />
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <BrandLogo tone="light" size="md" className="justify-center" />
          <h1 className="mama-heading mt-4 text-2xl">Register Your Clinic</h1>
          <p className="mama-copy mt-2 text-sm">
            Join the MamaAlert network to receive pre-alerts when patients are on their way.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Clinic Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="clinic-name">Clinic / Facility Name *</Label>
              <Input
                id="clinic-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. City Health Center"
                autoComplete="organization"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clinic-phone">Phone Number *</Label>
              <Input
                id="clinic-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(normalizePhoneInput(e.target.value))}
                placeholder="+91 98765 43210"
                autoComplete="tel"
              />
              <p className="text-xs text-muted-foreground">
                SMS alerts will be sent to this number
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="clinic-type">Facility Type</Label>
              <Select value={clinicType} onValueChange={(v) => setClinicType(v as ClinicType)}>
                <SelectTrigger id="clinic-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {clinicTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {clinicTypeLabels[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              {zonesErr ? <p className="text-sm text-destructive">{zonesErr}</p> : null}
              {zones.length > 0 && !zonesErr ? (
                <>
                  <Label htmlFor="clinic-zone-pick">Choose your area if listed</Label>
                  <select
                    id="clinic-zone-pick"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={pickedZoneId}
                    onChange={(e) => {
                      const v = e.target.value
                      setPickedZoneId(v)
                      if (v) {
                        const row = zones.find((z) => z.id === v)
                        setZoneName(row?.name ?? '')
                      }
                    }}
                  >
                    <option value="">— Select, or type the name below —</option>
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name}
                      </option>
                    ))}
                  </select>
                </>
              ) : null}
              <Label htmlFor="clinic-zone-name">Program / area name</Label>
              <Input
                id="clinic-zone-name"
                value={zoneName}
                onChange={(e) => setZoneName(e.target.value)}
                placeholder="e.g. North District MamaAlert"
                autoComplete="off"
                disabled={Boolean(pickedZoneId)}
                readOnly={Boolean(pickedZoneId)}
              />
              <p className="text-xs text-muted-foreground">
                Type the name your coordinator saved in MamaAlert. You do not need a visible dropdown — typing is
                enough.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="clinic-24hr"
                checked={is24hr}
                onCheckedChange={(checked) => setIs24hr(checked === true)}
              />
              <Label htmlFor="clinic-24hr" className="text-sm font-normal">
                Open 24 hours
              </Label>
            </div>

            <div className="space-y-2">
              <Label>Location *</Label>
              <div className="overflow-hidden rounded-lg border">
                <MapView
                  className="h-48 w-full rounded-md"
                  center={[lat ?? 0, lng ?? 0]}
                  zoom={lat !== null && lng !== null ? 14 : 2}
                  patients={
                    lat !== null && lng !== null
                      ? [{ id: 'clinic-reg', name: 'Clinic', lat, lng }]
                      : []
                  }
                  scrollWheelZoom={false}
                />
              </div>
              {geoErr ? (
                <p className="text-sm text-destructive">{geoErr}</p>
              ) : lat !== null && lng !== null ? (
                <p className="text-xs text-muted-foreground">
                  Location captured: {lat.toFixed(5)}, {lng.toFixed(5)}
                </p>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={captureLocation}
                disabled={geoLoading}
              >
                {geoLoading ? 'Getting location...' : lat ? 'Update Location' : 'Share Location'}
              </Button>
            </div>

            {submitErr ? <ErrorMessage message={submitErr} /> : null}

            <Button
              type="button"
              className="w-full"
              onClick={submit}
              disabled={submitting}
            >
              {submitting ? 'Registering...' : 'Register Clinic'}
            </Button>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Already registered?{' '}
            <Link to="/hospital" className={cn(buttonVariants({ variant: 'link', size: 'sm' }), 'h-auto p-0')}>
              Sign in with your token
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
