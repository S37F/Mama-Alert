/**
 * Phase 4.2 — Supabase Realtime on `public.alerts`.
 *
 * Requires: replication enabled for `alerts`, and RLS policies that allow the current role
 * (often `authenticated` with JWT) to SELECT rows you expect. Anonymous clients typically get
 * empty data or errors until policies are added.
 */
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/services/supabase'
import type { Alert, AlertPriority, AlertStatus } from '@/types/alert'

function isAlertStatus(value: string): value is AlertStatus {
  return (
    value === 'active' ||
    value === 'volunteer_responding' ||
    value === 'at_facility' ||
    value === 'resolved' ||
    value === 'cancelled'
  )
}

function toPriority(value: number): AlertPriority {
  if (value === 2) {
    return 2
  }
  if (value === 3) {
    return 3
  }
  return 1
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function mapRowToAlert(row: Record<string, unknown>): Alert | null {
  const id = row.id
  const patient_id = row.patient_id
  const statusRaw = row.status
  const priorityRaw = row.priority
  const triggered_at = row.triggered_at
  if (
    typeof id !== 'string' ||
    typeof patient_id !== 'string' ||
    typeof statusRaw !== 'string' ||
    typeof triggered_at !== 'string'
  ) {
    return null
  }
  if (!isAlertStatus(statusRaw)) {
    return null
  }
  const priority = typeof priorityRaw === 'number' ? toPriority(priorityRaw) : 1
  const resolved_at = typeof row.resolved_at === 'string' ? row.resolved_at : null
  const responding_volunteer_id =
    typeof row.responding_volunteer_id === 'string' ? row.responding_volunteer_id : null
  const volunteer_confirmed_at =
    typeof row.volunteer_confirmed_at === 'string' ? row.volunteer_confirmed_at : null

  return {
    id,
    patient_id,
    status: statusRaw,
    priority,
    triggered_at,
    resolved_at,
    responding_volunteer_id,
    volunteer_confirmed_at,
  }
}

const ALERT_SELECT = `
  id,
  patient_id,
  status,
  priority,
  triggered_at,
  resolved_at,
  responding_volunteer_id,
  volunteer_confirmed_at
`

export function useRealtimeAlerts(zone?: string): {
  alerts: Alert[]
  isLoading: boolean
  error: Error | null
} {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    if (!supabase) {
      setAlerts([])
      setIsLoading(false)
      return
    }
    try {
      const res = zone
        ? await supabase
            .from('alerts')
            .select(`${ALERT_SELECT}, patients!inner ( zone_id )`)
            .eq('patients.zone_id', zone)
            .order('triggered_at', { ascending: false })
            .limit(200)
        : await supabase
            .from('alerts')
            .select(`${ALERT_SELECT}, patients ( zone_id )`)
            .order('triggered_at', { ascending: false })
            .limit(200)

      if (res.error) {
        throw new Error(res.error.message)
      }

      const rows = Array.isArray(res.data) ? res.data : []
      const mapped: Alert[] = []
      for (const raw of rows) {
        if (!isRecord(raw)) {
          continue
        }
        const a = mapRowToAlert(raw)
        if (a) {
          mapped.push(a)
        }
      }
      setAlerts(mapped)
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)))
      setAlerts([])
    } finally {
      setIsLoading(false)
    }
  }, [zone])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!supabase) {
      return
    }
    const client = supabase
    const channel = client
      .channel(zone ? `alerts:${zone}` : 'alerts:all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, () => {
        void load()
      })
      .subscribe()

    return () => {
      void client.removeChannel(channel)
    }
  }, [zone, load])

  return { alerts, isLoading, error }
}
