/**
 * Phase 4.1 — destructive `Alert` + retry. Title carries the message body (spec asks for Alert + retry, not a separate description).
 */
import { useTranslation } from 'react-i18next'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertTitle } from '@/components/ui/alert'

interface ErrorMessageProps {
  message?: string
  onRetry?: () => void
}

export function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  const { t } = useTranslation()
  const text = message ?? t('common.error')

  return (
    <Alert variant="destructive" className="relative">
      <AlertCircle className="size-4" aria-hidden />
      <AlertTitle>{text}</AlertTitle>
      {onRetry ? (
        <div className="mt-3 flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={onRetry}>
            {t('common.retry')}
          </Button>
        </div>
      ) : null}
    </Alert>
  )
}
