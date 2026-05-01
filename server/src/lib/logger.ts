import { getRequestId } from '@/lib/requestContext'

function withRequestId(meta?: Record<string, unknown>): Record<string, unknown> | undefined {
  const requestId = getRequestId()
  if (!requestId) {
    return meta
  }
  return { ...(meta ?? {}), requestId }
}

export function logError(message: string, meta?: Record<string, unknown>): void {
  const data = withRequestId(meta)
  if (data) {
    console.error(message, data)
  } else {
    console.error(message)
  }
}

export function logWarn(message: string, meta?: Record<string, unknown>): void {
  const data = withRequestId(meta)
  if (data) {
    console.warn(message, data)
  } else {
    console.warn(message)
  }
}

/** Structured audit line (SOS, claims, admin actions). */
export function logAudit(event: string, meta?: Record<string, unknown>): void {
  const line = { audit: true, event, ...withRequestId(meta), at: new Date().toISOString() }
  console.log(JSON.stringify(line))
}
