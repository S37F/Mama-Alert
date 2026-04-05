import type { AlertStatus, AlertSummary } from '@/types/alert'
import type { VolunteerFeedItem } from '@/services/api'

function toAlertStatus(s: string): AlertStatus {
  if (
    s === 'active' ||
    s === 'volunteer_responding' ||
    s === 'at_facility' ||
    s === 'resolved' ||
    s === 'cancelled'
  ) {
    return s
  }
  return 'active'
}

export function volunteerFeedItemToSummary(it: VolunteerFeedItem): AlertSummary {
  return {
    id: it.alertId,
    status: toAlertStatus(it.status),
    triggeredAt: it.triggeredAt,
    patientFirstName: it.patientFirstName,
    landmark: it.landmark,
    weeksPregnant: it.weeksPregnant,
    distanceKm: it.distanceKm,
    response: it.response,
  }
}
