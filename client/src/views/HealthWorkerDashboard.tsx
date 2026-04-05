import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'
import { useAuth } from '@/hooks/useAuth'
import { useZoneId } from '@/hooks/useZoneId'
import {
  getCoordinatorAlerts,
  getWorkerPatients,
  getWorkerVolunteers,
  type CoordinatorAlertItem,
  type WorkerPatientRow,
  type WorkerVolunteerRow,
} from '@/services/api'
import { HealthWorkerRegister } from '@/views/HealthWorkerRegister'

export function HealthWorkerDashboard() {
  const { t } = useTranslation()
  const { logout } = useAuth()
  const zoneId = useZoneId()
  const [tab, setTab] = useState('overview')
  const [patients, setPatients] = useState<WorkerPatientRow[]>([])
  const [volunteers, setVolunteers] = useState<WorkerVolunteerRow[]>([])
  const [alerts, setAlerts] = useState<CoordinatorAlertItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{t('worker.title')}</h1>
        <div className="flex gap-2">
          <Link to="/register" className={cn(buttonVariants({ variant: 'outline' }))}>
            {t('worker.openRegister')}
          </Link>
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
            <CardContent>
              {!zoneId ? (
                <p className="text-muted-foreground text-sm">{t('worker.noZoneVolunteers')}</p>
              ) : volunteers.length === 0 ? (
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
          <HealthWorkerRegister />
        </TabsContent>
      </Tabs>
    </div>
  )
}
