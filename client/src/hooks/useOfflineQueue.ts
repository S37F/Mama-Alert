/**
 * Phase 4.2 / 5 — IndexedDB queue, drain via `postSos`, Background Sync after enqueue (Phase 5).
 */
import { useCallback, useEffect, useState } from 'react'
import { listPendingAlerts, queueOfflineAlert, removePendingAlert } from '@/services/offline'
import { registerSosBackgroundSync } from '@/services/pwaSync'
import { postSos } from '@/services/api'
import type { PendingAlert, SosPayload } from '@/types/api'

function isSosPayload(value: unknown): value is SosPayload {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const o = value as Record<string, unknown>
  return (
    typeof o.phone === 'string' &&
    (o.triggerMethod === 'pwa' || o.triggerMethod === 'sms' || o.triggerMethod === 'ussd')
  )
}

function toPendingAlerts(
  items: { id: string; payload: unknown; createdAt: string }[],
): PendingAlert[] {
  const out: PendingAlert[] = []
  for (const item of items) {
    if (!isSosPayload(item.payload)) {
      continue
    }
    out.push({
      id: item.id,
      payload: item.payload,
      createdAt: item.createdAt,
    })
  }
  return out
}

export function useOfflineQueue(): {
  queue: PendingAlert[]
  addToQueue: (payload: SosPayload) => Promise<void>
  processPending: () => Promise<void>
  pendingCount: number
} {
  const [queue, setQueue] = useState<PendingAlert[]>([])

  const syncQueue = useCallback(async () => {
    const items = await listPendingAlerts()
    setQueue(toPendingAlerts(items))
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const items = await listPendingAlerts()
      if (!cancelled) {
        setQueue(toPendingAlerts(items))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const addToQueue = useCallback(
    async (payload: SosPayload) => {
      await queueOfflineAlert(payload)
      await registerSosBackgroundSync()
      await syncQueue()
    },
    [syncQueue],
  )

  const processPending = useCallback(async () => {
    const items = await listPendingAlerts()
    for (const item of items) {
      if (!isSosPayload(item.payload)) {
        continue
      }
      try {
        await postSos(item.payload)
        await removePendingAlert(item.id)
      } catch {
        /* keep queued for next attempt */
      }
    }
    await syncQueue()
  }, [syncQueue])

  return {
    queue,
    addToQueue,
    processPending,
    pendingCount: queue.length,
  }
}
