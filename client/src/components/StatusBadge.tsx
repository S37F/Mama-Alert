import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import type { AlertStatus } from '@/types/alert'

interface StatusBadgeProps {
  status: AlertStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const { t } = useTranslation()
  const labelKey = `status.${status}`

  const variant =
    status === 'active'
      ? 'destructive'
      : status === 'volunteer_responding'
        ? 'default'
        : status === 'at_facility'
          ? 'secondary'
          : status === 'resolved'
            ? 'outline'
            : 'secondary'

  return (
    <Badge variant={variant} className="capitalize">
      {t(labelKey)}
    </Badge>
  )
}
