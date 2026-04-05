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
