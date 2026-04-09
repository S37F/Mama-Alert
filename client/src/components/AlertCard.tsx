/**
 * Phase 4.1 volunteer card. `actionsDisabled` is an app-level guard while YES/NO is in flight (not in the prompt snippet).
 */
import { useTranslation } from 'react-i18next'
import { CheckCircle2, XCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/StatusBadge'
import type { AlertSummary } from '@/types/alert'

interface AlertCardProps {
  alert: AlertSummary
  onAccept: (alertId: string) => Promise<void>
  onDecline: (alertId: string) => Promise<void>
  showActions?: boolean
  actionsDisabled?: boolean
  minutesAgo: number
  distanceLabel?: string | null
}

export function AlertCard({
  alert,
  onAccept,
  onDecline,
  showActions = true,
  actionsDisabled = false,
  minutesAgo,
  distanceLabel,
}: AlertCardProps) {
  const { t } = useTranslation()

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-row items-start justify-between gap-2">
          <CardTitle className="text-lg font-semibold">{alert.patientFirstName}</CardTitle>
          <StatusBadge status={alert.status} />
        </div>
        <p className="text-muted-foreground text-sm">
          {alert.landmark ? `${alert.landmark} · ` : ''}
          {alert.weeksPregnant !== null ? t('sos.weeks', { n: alert.weeksPregnant }) : ''}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-muted-foreground text-sm">
          {t('volunteer.minutesAgo', { n: minutesAgo })}
          {distanceLabel ? ` · ${distanceLabel}` : ''}
        </p>
        {showActions ? (
          <>
            <Button
              type="button"
              className="w-full bg-green-600 text-white hover:bg-green-700"
              disabled={actionsDisabled}
              aria-label={`${t('volunteer.accept')}, ${alert.patientFirstName}`}
              onClick={() => void onAccept(alert.id)}
            >
              <CheckCircle2 className="mr-2 size-4" aria-hidden />
              {t('volunteer.accept')}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              disabled={actionsDisabled}
              aria-label={`${t('volunteer.decline')}, ${alert.patientFirstName}`}
              onClick={() => void onDecline(alert.id)}
            >
              <XCircle className="mr-2 size-4" aria-hidden />
              {t('volunteer.decline')}
            </Button>
          </>
        ) : (
          <p className="text-muted-foreground text-sm">{alert.response ?? alert.status}</p>
        )}
      </CardContent>
    </Card>
  )
}
