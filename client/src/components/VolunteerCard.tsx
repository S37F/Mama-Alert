import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Volunteer } from '@/types/volunteer'

interface VolunteerCardProps {
  volunteer: Volunteer
}

export function VolunteerCard({ volunteer }: VolunteerCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{volunteer.name}</CardTitle>
      </CardHeader>
      <CardContent className="text-muted-foreground text-sm">
        <p>{volunteer.phone}</p>
      </CardContent>
    </Card>
  )
}
