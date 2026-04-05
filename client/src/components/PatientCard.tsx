import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Patient } from '@/types/patient'

interface PatientCardProps {
  patient: Patient
}

export function PatientCard({ patient }: PatientCardProps) {
  const { t } = useTranslation()
  return (
    <Card>
      <CardHeader>
        <CardTitle>{patient.name}</CardTitle>
      </CardHeader>
      <CardContent className="text-muted-foreground text-sm">
        {patient.weeks_pregnant !== null ? (
          <p>{t('sos.weeks', { n: patient.weeks_pregnant })}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}
