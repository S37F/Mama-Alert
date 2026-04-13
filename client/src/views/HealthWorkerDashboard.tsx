import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'
import { NetworkOfflineBanner } from '@/components/NetworkOfflineBanner'
import { useAlertsRealtimeRefresh } from '@/hooks/useAlertsRealtimeRefresh'
import { useAuth } from '@/hooks/useAuth'
import { useZoneId } from '@/hooks/useZoneId'
import { useGeolocation } from '@/hooks/useGeolocation'
import {
  getCoordinatorAlerts,
  getWorkerPatients,
  getWorkerVolunteers,
  patchWorkerPatient,
  type CoordinatorAlertItem,
  type EmergencyRelationship,
  type WorkerPatientRow,
  type WorkerVolunteerRow,
} from '@/services/api'
import { HealthWorkerRegister } from '@/views/HealthWorkerRegister'
import { WorkerVolunteerRegisterForm } from '@/views/WorkerVolunteerRegisterForm'

const relationshipValues: EmergencyRelationship[] = [
  'husband',
  'mother',
  'sister',
  'neighbour',
  'other',
]

function CompletePatientDialog({
  patient,
  open,
  onClose,
  onSaved,
  t,
}: {
  patient: WorkerPatientRow | null
  open: boolean
  onClose: () => void
  onSaved: () => void
  t: (key: string) => string
}) {
  const { lat, lng, error: geoErr, isLoading: geoLoading, capture: captureLocation } = useGeolocation()
  const [village, setVillage] = useState('')
  const [cName, setCName] = useState('')
  const [cPhone, setCPhone] = useState('')
  const [cRel, setCRel] = useState<EmergencyRelationship>('husband')
  const [saving, setSaving] = useState(false)
  const [formErr, setFormErr] = useState<string | null>(null)

  useEffect(() => {
    if (patient) {
      setVillage(patient.village ?? '')
      setCName('')
      setCPhone('')
      setCRel('husband')
      setFormErr(null)
    }
  }, [patient])

  const save = async () => {
    if (!patient) {
      return
    }
    const v = village.trim()
    if (v.length < 1) {
      setFormErr(t('sos.selfReg.villageRequired'))
      return
    }
    if (!cName.trim() || cPhone.trim().length < 8) {
      setFormErr(t('sos.selfReg.contactRequired'))
      return
    }
    setSaving(true)
    setFormErr(null)
    try {
      await patchWorkerPatient(patient.id, {
        village: v,
        emergency_contacts: [{ name: cName.trim(), phone: cPhone.trim(), relationship: cRel }],
        complete_profile: true,
        ...(lat !== null && lng !== null ? { lat, lng } : {}),
      })
      onSaved()
      onClose()
    } catch (e) {
      setFormErr(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('worker.completeProfileTitle')}</DialogTitle>
          <DialogDescription>{t('worker.completeProfileDesc')}</DialogDescription>
        </DialogHeader>
        {patient ? (
          <div className="space-y-3">
            <p className="text-muted-foreground text-xs">
              {patient.name} · {patient.phonePrimary}
            </p>
            <div className="space-y-2">
              <Label htmlFor="cp-village">{t('register.fields.village')}</Label>
              <Input id="cp-village" value={village} onChange={(e) => setVillage(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cp-cn">{t('register.fields.contactName')}</Label>
              <Input id="cp-cn" value={cName} onChange={(e) => setCName(e.target.value)} />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cp-cp">{t('register.fields.contactPhone')}</Label>
                <Input id="cp-cp" type="tel" value={cPhone} onChange={(e) => setCPhone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t('register.fields.relationship')}</Label>
                <Select value={cRel} onValueChange={(v) => setCRel(v as EmergencyRelationship)}>
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
            <Button type="button" variant="secondary" size="sm" disabled={geoLoading} onClick={captureLocation}>
              {geoLoading ? t('common.loading') : t('register.captureLocation')}
            </Button>
            {geoErr ? <p className="text-destructive text-xs">{geoErr}</p> : null}
            {lat !== null && lng !== null ? (
              <p className="text-muted-foreground text-xs">
                {lat.toFixed(5)}, {lng.toFixed(5)}
              </p>
            ) : null}
            {formErr ? <p className="text-destructive text-sm">{formErr}</p> : null}
          </div>
        ) : null}
        <DialogFooter className="border-0 bg-transparent p-0 sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            {t('sos.access.back')}
          </Button>
          <Button type="button" disabled={saving || !patient} onClick={() => void save()}>
            {saving ? t('common.loading') : t('worker.saveProfile')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function HealthWorkerDashboard() {
  const { t } = useTranslation()
  const { logout, session, isLoading: authLoading } = useAuth()
  const zoneId = useZoneId()
  const [tab, setTab] = useState('overview')
  const [patients, setPatients] = useState<WorkerPatientRow[]>([])
  const [volunteers, setVolunteers] = useState<WorkerVolunteerRow[]>([])
  const [alerts, setAlerts] = useState<CoordinatorAlertItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [completePatient, setCompletePatient] = useState<WorkerPatientRow | null>(null)

  const incompletePatients = useMemo(
    () => patients.filter((p) => !p.registrationVerified),
    [patients],
  )

  const load = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const [p, v, a] = await Promise.all([getWorkerPatients(), getWorkerVolunteers(), getCoordinatorAlerts()])
      setPatients(p)
      setVolunteers(v)
      setAlerts(a)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setLoading(false)
    }
  }, [t])

  const refreshCoordinatorAlerts = useCallback(async () => {
    try {
      const a = await getCoordinatorAlerts()
      setAlerts(a)
    } catch {
      /* keep existing list */
    }
  }, [])

  useAlertsRealtimeRefresh(!authLoading && !!session, zoneId, () => {
    void refreshCoordinatorAlerts()
  })

  useEffect(() => {
    void load()
  }, [load])

  /** Fallback if Realtime misses an event (rare). */
  useEffect(() => {
    if (tab !== 'overview') {
      return
    }
    const id = window.setInterval(() => {
      void refreshCoordinatorAlerts()
    }, 90_000)
    return () => window.clearInterval(id)
  }, [tab, refreshCoordinatorAlerts])

  return (
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-5xl space-y-4 p-6 outline-none">
      <NetworkOfflineBanner variant="liveData" />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{t('worker.title')}</h1>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => setTab('register')}>
            {t('worker.openRegister')}
          </Button>
          <Button type="button" variant="outline" onClick={() => void logout()}>
            {t('auth.signOut')}
          </Button>
        </div>
      </div>

      {error ? <ErrorMessage message={error} onRetry={() => void load()} /> : null}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">{t('worker.tabOverview')}</TabsTrigger>
          <TabsTrigger value="register">{t('worker.tabRegister')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-6">
          {loading ? <LoadingSpinner variant="inline" /> : null}

          <Card>
            <CardHeader>
              <CardTitle>{t('worker.activeAlerts')}</CardTitle>
            </CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t('worker.noAlerts')}</p>
              ) : (
                <ul className="space-y-2">
                  {alerts.map((a) => (
                    <li
                      key={a.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
                    >
                      <span className="font-medium">{a.patient.name}</span>
                      <Badge variant="outline">{a.status}</Badge>
                      <span className="text-muted-foreground">
                        {a.responding_volunteer_name ?? a.patient.landmark ?? '—'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('worker.needsProfile')}</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {incompletePatients.length === 0 ? (
                <p className="text-muted-foreground text-sm">—</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('register.fields.name')}</TableHead>
                      <TableHead>{t('worker.phoneCol')}</TableHead>
                      <TableHead>{t('register.fields.village')}</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {incompletePatients.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{p.name}</TableCell>
                        <TableCell className="whitespace-nowrap text-xs">{p.phonePrimary}</TableCell>
                        <TableCell>{p.village ?? '—'}</TableCell>
                        <TableCell className="text-right">
                          <Button type="button" size="sm" variant="secondary" onClick={() => setCompletePatient(p)}>
                            {t('worker.completeProfile')}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('worker.myPatients')}</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {patients.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t('worker.noPatients')}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('register.fields.name')}</TableHead>
                      <TableHead>{t('worker.weeksCol')}</TableHead>
                      <TableHead>{t('admin.atRiskAnc')}</TableHead>
                      <TableHead>{t('register.sections.risks')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {patients.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{p.name}</TableCell>
                        <TableCell>
                          {p.weeksPregnant !== null ? t('worker.weeksShort', { n: p.weeksPregnant }) : '—'}
                        </TableCell>
                        <TableCell>
                          {p.overdueAnc ? <Badge variant="destructive">{t('worker.ancOverdue')}</Badge> : '—'}
                        </TableCell>
                        <TableCell className="max-w-[140px] truncate text-xs">
                          {p.riskFlags.length ? p.riskFlags.join(', ') : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('worker.zoneVolunteers')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <WorkerVolunteerRegisterForm zoneId={zoneId} onRegistered={() => void load()} />
              {!zoneId ? null : volunteers.length === 0 ? (
                <p className="text-muted-foreground text-sm">—</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('register.fields.name')}</TableHead>
                      <TableHead>{t('admin.vehicle')}</TableHead>
                      <TableHead>{t('admin.active')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {volunteers.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell>{v.name}</TableCell>
                        <TableCell>{v.vehicle ?? '—'}</TableCell>
                        <TableCell>{v.is_active ? t('admin.active') : t('admin.deactivate')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="register" className="mt-4">
          <HealthWorkerRegister embedded />
        </TabsContent>
      </Tabs>

      <CompletePatientDialog
        patient={completePatient}
        open={completePatient !== null}
        onClose={() => setCompletePatient(null)}
        onSaved={() => void load()}
        t={t}
      />
    </main>
  )
}
