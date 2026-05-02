/**
 * Refetch callback when `public.alerts` rows change (Supabase Realtime).
 * Health worker / coordinator UIs use this instead of polling alone.
 */
import { useEffect, useRef } from 'react'
import { supabase } from '@/services/supabase'

export function useAlertsRealtimeRefresh(
  enabled: boolean,
  zoneId: string | null | undefined,
  onRefresh: () => void,
): void {
  const onRefreshRef = useRef(onRefresh)

  useEffect(() => {
    onRefreshRef.current = onRefresh
  }, [onRefresh])

  useEffect(() => {
    if (!enabled || !supabase) {
      return
    }
    const client = supabase
    const channelName = zoneId ? `worker-alerts:${zoneId}` : 'worker-alerts'
    const channel = client
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, () => {
        onRefreshRef.current()
      })
      .subscribe()

    return () => {
      void client.removeChannel(channel)
    }
  }, [enabled, zoneId])
}
