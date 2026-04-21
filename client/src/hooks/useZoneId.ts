import { useAuthContext } from '@/contexts/AuthContext'

export function useZoneId(): string | null {
  return useAuthContext().zoneId
}
