import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MapView } from '@/components/MapView'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'
import { NetworkOfflineBanner } from '@/components/NetworkOfflineBanner'
import { useAuth } from '@/hooks/useAuth'
import { useZoneId } from '@/hooks/useZoneId'
import {
  getAdminPatients,
  getAdminVolunteers,
  getAdminAlertsHistory,
  getAdminMapPoints,
  getAdminZoneEscalation,
  getAdminHealthWorkers,
  patchAdminHospital,
  patchAdminZoneEscalation,
  patchVolunteerActive,
  postAdminHospitalPortalToken,
  type AdminPatientRow,
  type AdminVolunteerRow,
  type AdminAlertHistoryRow,
  type AdminMapPoints,
  type AdminZoneEscalation,
  type AdminHealthWorkerRow,
} from '@/services/api'

function csvEscape(cell: string): string {
  const s = String(cell)
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function downloadCsv(filename: string, rows: string[][]) {
  const bom = '\uFEFF'
  const body = rows.map((r) => r.map(csvEscape).join(',')).join('\n')
  const blob = new Blob([bom + body], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

function AdminZoneMap({ data }: { data: AdminMapPoints }) {
  const center: [number, number] = useMemo(() => {
    const p = data.patients[0]
    if (p) {
      return [p.lat, p.lng]
    }
    const v = data.volunteers[0]
    if (v) {
      return [v.lat, v.lng]
    }
    const h = data.hospitals[0]
    if (h) {
      return [h.lat, h.lng]
    }
    const a = data.activeAlerts[0]
    if (a) {
      return [a.lat, a.lng]
    }
    return [18.5204, 73.8567]
  }, [data])

  return (
    <MapView
      center={center}
      zoom={12}
      className="h-[420px] w-full overflow-hidden rounded-md border"
      scrollWheelZoom
      patients={data.patients}
      volunteers={data.volunteers}
      hospitals={data.hospitals}
      activeAlerts={data.activeAlerts.map((x) => ({ id: x.alert_id, lat: x.lat, lng: x.lng }))}
    />
  )
}

export function AdminZone() {
  const { t } = useTranslation()
  const { logout } = useAuth()
  const zoneId = useZoneId()
  const [patients, setPatients] = useState<AdminPatientRow[]>([])
  const [volunteers, setVolunteers] = useState<AdminVolunteerRow[]>([])
  const [alerts, setAlerts] = useState<AdminAlertHistoryRow[]>([])
  const [avgVolunteerConfirmMs, setAvgVolunteerConfirmMs] = useState<number | null>(null)
  const [avgResolveMs, setAvgResolveMs] = useState<number | null>(null)
  const [mapData, setMapData] = useState<AdminMapPoints | null>(null)
  const [zoneEscalation, setZoneEscalation] = useState<AdminZoneEscalation | null>(null)
  const [healthWorkers, setHealthWorkers] = useState<AdminHealthWorkerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState('patients')

  const [escR1Km, setEscR1Km] = useState('')
  const [escR2Km, setEscR2Km] = useState('')
  const [escR3Km, setEscR3Km] = useState('')
  const [escDelaySec, setEscDelaySec] = useState('')

  const load = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const [p, v, a, m] = await Promise.all([
        getAdminPatients(),
        getAdminVolunteers(),
        getAdminAlertsHistory(),
        getAdminMapPoints(),
      ])
      setPatients(p)
      setVolunteers(v)
      setAlerts(a.alerts)
      setAvgVolunteerConfirmMs(a.avgVolunteerConfirmMs ?? a.avgResponseMs)
      setAvgResolveMs(a.avgResolveMs ?? a.avgResponseMs)
      setMapData(m)

      if (zoneId) {
        try {
          const z = await getAdminZoneEscalation()
          setZoneEscalation(z)
        } catch {
          setZoneEscalation(null)
        }
        try {
          const hw = await getAdminHealthWorkers()
          setHealthWorkers(hw)
        } catch {
          setHealthWorkers([])
        }
      } else {
        setZoneEscalation(null)
        setHealthWorkers([])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setLoading(false)
    }
  }, [t, zoneId])

  useEffect(() => {
    if (!zoneEscalation) {
      return
    }
    setEscR1Km(zoneEscalation.escalation_r1_m != null ? String(zoneEscalation.escalation_r1_m / 1000) : '')
    setEscR2Km(zoneEscalation.escalation_r2_m != null ? String(zoneEscalation.escalation_r2_m / 1000) : '')
    setEscR3Km(zoneEscalation.escalation_r3_m != null ? String(zoneEscalation.escalation_r3_m / 1000) : '')
    setEscDelaySec(
      zoneEscalation.escalation_delay_ms != null ? String(Math.round(zoneEscalation.escalation_delay_ms / 1000)) : '',
    )
  }, [zoneEscalation])

  useEffect(() => {
    void load()
  }, [load])

  const toggleVol = async (id: string, active: boolean) => {
    try {
      await patchVolunteerActive(id, !active)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
    }
  }

  const exportPatients = () => {
    const rows: string[][] = [
      ['id', 'name', 'healthWorker', 'weeksPregnant', 'riskFlags', 'lastAncDate', 'overdueAnc'],
      ...patients.map((p) => [
        p.id,
        p.name,
        p.healthWorkerName,
        p.weeksPregnant != null ? String(p.weeksPregnant) : '',
        p.riskFlags.join(';'),
        p.lastAncDate ?? '',
        p.overdueAnc ? 'yes' : 'no',
      ]),
    ]
    downloadCsv('mamaalert-patients.csv', rows)
  }

  const exportVolunteers = () => {
    const rows: string[][] = [
      ['id', 'name', 'skills', 'vehicle', 'max_radius_km', 'is_active', 'last_response_at'],
      ...volunteers.map((v) => [
        v.id,
        v.name,
        v.skills.join(';'),
        v.vehicle,
        String(v.max_radius_km),
        v.is_active ? 'yes' : 'no',
        v.last_response_at ?? '',
      ]),
    ]
    downloadCsv('mamaalert-volunteers.csv', rows)
  }

  const exportAlerts = () => {
    const rows: string[][] = [
      [
        'id',
        'patientName',
        'triggeredAt',
        'volunteerConfirmMin',
        'resolveTimeMin',
        'volunteerName',
        'outcome',
      ],
      ...alerts.map((a) => [
        a.id,
        a.patientName,
        a.triggeredAt,
        a.volunteerConfirmMs !== null ? String(Math.round(a.volunteerConfirmMs / 60_000)) : '',
        a.resolveTimeMs !== null ? String(Math.round(a.resolveTimeMs / 60_000)) : '',
        a.volunteerName ?? '',
        a.outcome,
      ]),
    ]
    downloadCsv('mamaalert-alerts.csv', rows)
  }

  const copyHospitalPortalToken = async (hospitalId: string) => {
    try {
      const { token } = await postAdminHospitalPortalToken(hospitalId)
      await navigator.clipboard.writeText(token)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
    }
  }

  const saveEscalation = async () => {
    if (!zoneId) {
      return
    }
    const parseKm = (s: string): number | null => {
      if (s.trim() === '') {
        return null
      }
      const n = Number.parseFloat(s)
      if (!Number.isFinite(n) || n < 5 || n > 50) {
        throw new Error(t('admin.escalationKmRange'))
      }
      return Math.round(n * 1000)
    }
    const parseSec = (s: string): number | null => {
      if (s.trim() === '') {
        return null
      }
      const n = Number.parseInt(s, 10)
      if (!Number.isFinite(n) || n < 30) {
        throw new Error(t('admin.escalationDelayMin'))
      }
      return n * 1000
    }
    const dbR1 =
      zoneEscalation?.escalation_r1_m != null ? String(zoneEscalation.escalation_r1_m / 1000) : ''
    const dbR2 =
      zoneEscalation?.escalation_r2_m != null ? String(zoneEscalation.escalation_r2_m / 1000) : ''
    const dbR3 =
      zoneEscalation?.escalation_r3_m != null ? String(zoneEscalation.escalation_r3_m / 1000) : ''
    const dbDelay =
      zoneEscalation?.escalation_delay_ms != null
        ? String(Math.round(zoneEscalation.escalation_delay_ms / 1000))
        : ''
    try {
      const patch: {
        escalation_r1_m?: number | null
        escalation_r2_m?: number | null
        escalation_r3_m?: number | null
        escalation_delay_ms?: number | null
      } = {}
      if (escR1Km.trim() !== dbR1.trim()) {
        patch.escalation_r1_m = parseKm(escR1Km)
      }
      if (escR2Km.trim() !== dbR2.trim()) {
        patch.escalation_r2_m = parseKm(escR2Km)
      }
      if (escR3Km.trim() !== dbR3.trim()) {
        patch.escalation_r3_m = parseKm(escR3Km)
      }
      if (escDelaySec.trim() !== dbDelay.trim()) {
        patch.escalation_delay_ms = parseSec(escDelaySec)
      }
      if (Object.keys(patch).length === 0) {
        return
      }
      await patchAdminZoneEscalation(patch)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
    }
  }

  const onHospitalReceiveToggle = async (id: string, checked: boolean) => {
    try {
      await patchAdminHospital(id, checked)
      setMapData((prev) => {
        if (!prev) {
          return prev
        }
        return {
          ...prev,
          hospitals: prev.hospitals.map((h) => (h.id === id ? { ...h, receive_alerts: checked } : h)),
        }
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
    }
  }

  const avgVolunteerMin =
    avgVolunteerConfirmMs !== null ? Math.round(avgVolunteerConfirmMs / 60_000) : null
  const avgResolveMin = avgResolveMs !== null ? Math.round(avgResolveMs / 60_000) : null

  return (
    <main id="main-content" tabIndex={-1} className="mama-page mama-page-shell mama-page-shell--dashboard">
      <NetworkOfflineBanner variant="liveData" />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="mama-heading text-2xl">{t('admin.title')}</h1>
        <Button type="button" variant="outline" onClick={() => void logout()}>
          {t('auth.signOut')}
        </Button>
      </div>

      {error ? <ErrorMessage message={error} onRetry={() => void load()} /> : null}
      {loading && !patients.length ? <LoadingSpinner variant="inline" /> : null}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="patients">{t('admin.patients')}</TabsTrigger>
          <TabsTrigger value="volunteers">{t('admin.volunteers')}</TabsTrigger>
          <TabsTrigger value="alerts">{t('admin.alerts')}</TabsTrigger>
          <TabsTrigger value="map">{t('admin.mapTab')}</TabsTrigger>
          <TabsTrigger value="settings">{t('admin.settingsTab')}</TabsTrigger>
        </TabsList>

        <TabsContent value="patients" className="mt-4 space-y-2">
          <div className="flex justify-end">
            <Button type="button" variant="outline" size="sm" onClick={exportPatients}>
              {t('admin.exportCsv')}
            </Button>
          </div>
          <div className="mama-table-shell">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('register.fields.name')}</TableHead>
                  <TableHead>{t('admin.healthWorker')}</TableHead>
                  <TableHead>{t('register.fields.weeksPregnant')}</TableHead>
                  <TableHead>{t('register.sections.risks')}</TableHead>
                  <TableHead>{t('register.fields.lastAnc')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.healthWorkerName}</TableCell>
                    <TableCell>{p.weeksPregnant ?? '—'}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {p.riskFlags.map((r) => (
                          <Badge key={r} variant="secondary" className="text-xs">
                            {r}
                          </Badge>
                        ))}
                        {p.overdueAnc ? (
                          <Badge variant="destructive" className="text-xs">
                            {t('admin.atRiskAnc')}
                          </Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>{p.lastAncDate ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="volunteers" className="mt-4 space-y-2">
          <div className="flex justify-end">
            <Button type="button" variant="outline" size="sm" onClick={exportVolunteers}>
              {t('admin.exportCsv')}
            </Button>
          </div>
          <div className="mama-table-shell">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('register.fields.name')}</TableHead>
                  <TableHead>{t('admin.skills')}</TableHead>
                  <TableHead>{t('admin.vehicle')}</TableHead>
                  <TableHead>{t('admin.radius')}</TableHead>
                  <TableHead>{t('admin.lastResponse')}</TableHead>
                  <TableHead>{t('admin.active')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {volunteers.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">{v.name}</TableCell>
                    <TableCell>{v.skills.join(', ') || '—'}</TableCell>
                    <TableCell>{v.vehicle}</TableCell>
                    <TableCell>{v.max_radius_km} km</TableCell>
                    <TableCell>{v.last_response_at ?? '—'}</TableCell>
                    <TableCell>
                      <Button type="button" size="sm" variant="outline" onClick={() => void toggleVol(v.id, v.is_active)}>
                        {v.is_active ? t('admin.deactivate') : t('admin.activate')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {avgVolunteerMin !== null || avgResolveMin !== null ? (
              <p className="text-muted-foreground text-sm">
                Volunteer confirms: {avgVolunteerMin !== null ? `${avgVolunteerMin} min avg` : '—'} · Resolved:{' '}
                {avgResolveMin !== null ? `${avgResolveMin} min avg` : '—'}
              </p>
            ) : (
              <span />
            )}
            <Button type="button" variant="outline" size="sm" onClick={exportAlerts}>
              {t('admin.exportCsv')}
            </Button>
          </div>
          <div className="mama-table-shell">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('register.fields.name')}</TableHead>
                  <TableHead>{t('admin.triggeredAt')}</TableHead>
                  <TableHead>Volunteer confirm</TableHead>
                  <TableHead>Resolved</TableHead>
                  <TableHead>{t('admin.volunteer')}</TableHead>
                  <TableHead>{t('admin.outcome')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>{a.patientName}</TableCell>
                    <TableCell>{new Date(a.triggeredAt).toLocaleString()}</TableCell>
                    <TableCell>
                      {a.volunteerConfirmMs !== null ? `${Math.round(a.volunteerConfirmMs / 60_000)} min` : '—'}
                    </TableCell>
                    <TableCell>
                      {a.resolveTimeMs !== null ? `${Math.round(a.resolveTimeMs / 60_000)} min` : '—'}
                    </TableCell>
                    <TableCell>{a.volunteerName ?? '—'}</TableCell>
                    <TableCell>{a.outcome}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="map" className="mt-4 space-y-4">
          <p className="text-muted-foreground text-xs">{t('admin.mapLegend')}</p>
          {mapData ? <AdminZoneMap data={mapData} /> : null}
          {mapData && mapData.hospitals.length > 0 ? (
            <div className="mama-table-shell">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('admin.hospitalName')}</TableHead>
                    <TableHead>{t('admin.receiveAlerts')}</TableHead>
                    <TableHead>Portal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mapData.hospitals.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell className="font-medium">{h.name}</TableCell>
                      <TableCell>
                        <input
                          type="checkbox"
                          className="size-4 accent-primary"
                          checked={h.receive_alerts !== false}
                          onChange={(e) => void onHospitalReceiveToggle(h.id, e.target.checked)}
                          aria-label={t('admin.receiveAlerts')}
                        />
                      </TableCell>
                      <TableCell>
                        <Button type="button" size="sm" variant="outline" onClick={() => void copyHospitalPortalToken(h.id)}>
                          Copy portal token
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="settings" className="mt-4 space-y-8">
          {!zoneId ? (
            <p className="text-muted-foreground text-sm">{t('admin.noZoneForSettings')}</p>
          ) : (
            <>
              <div className="space-y-3">
                <h2 className="text-lg font-semibold">{t('admin.escalationTitle')}</h2>
                <p className="text-muted-foreground text-xs">{t('admin.escalationHint')}</p>
                <div className="grid max-w-md gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="esc-r1">{t('admin.escalationR1')}</Label>
                    <Input
                      id="esc-r1"
                      inputMode="decimal"
                      placeholder="10"
                      value={escR1Km}
                      onChange={(e) => setEscR1Km(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="esc-r2">{t('admin.escalationR2')}</Label>
                    <Input
                      id="esc-r2"
                      inputMode="decimal"
                      placeholder="20"
                      value={escR2Km}
                      onChange={(e) => setEscR2Km(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="esc-r3">{t('admin.escalationR3')}</Label>
                    <Input
                      id="esc-r3"
                      inputMode="decimal"
                      placeholder={t('admin.optional')}
                      value={escR3Km}
                      onChange={(e) => setEscR3Km(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="esc-delay">{t('admin.escalationDelay')}</Label>
                    <Input
                      id="esc-delay"
                      inputMode="numeric"
                      placeholder="300"
                      value={escDelaySec}
                      onChange={(e) => setEscDelaySec(e.target.value)}
                    />
                  </div>
                </div>
                <Button type="button" onClick={() => void saveEscalation()}>
                  {t('admin.saveEscalation')}
                </Button>
              </div>

              <div className="space-y-3">
                <h2 className="text-lg font-semibold">{t('admin.healthWorkersTitle')}</h2>
                  <div className="mama-table-shell">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('register.fields.name')}</TableHead>
                        <TableHead>{t('admin.phone')}</TableHead>
                        <TableHead>{t('admin.accessLevel')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {healthWorkers.map((hw) => (
                        <TableRow key={hw.user_id}>
                          <TableCell className="font-medium">{hw.name}</TableCell>
                          <TableCell>{hw.phone ?? '—'}</TableCell>
                          <TableCell>{hw.access_level}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </main>
  )
}
