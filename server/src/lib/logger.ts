export function logError(message: string, meta?: Record<string, unknown>): void {
  if (meta) {
    console.error(message, meta)
  } else {
    console.error(message)
  }
}

export function logWarn(message: string, meta?: Record<string, unknown>): void {
  if (meta) {
    console.warn(message, meta)
  } else {
    console.warn(message)
  }
}

/** Structured audit line (SOS, claims, admin actions). */
export function logAudit(event: string, meta?: Record<string, unknown>): void {
  const line = { audit: true, event, ...meta, at: new Date().toISOString() }
  console.log(JSON.stringify(line))
}
