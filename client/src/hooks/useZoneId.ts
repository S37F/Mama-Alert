import { useAuthContext } from '@/contexts/AuthContext'

/** Health-worker zone from login (not part of Phase 4 `useAuth` surface — see CURSOR_PROMPT Phase 4.2). */
export function useZoneId(): string | null {
  return useAuthContext().zoneId
}
