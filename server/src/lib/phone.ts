/** Normalize to trimmed E.164-style string (caller should store consistent format). */
export function normalizePhone(raw: string): string {
  const t = raw.trim()
  if (t.startsWith('+')) {
    return `+${t.slice(1).replace(/\D/g, '')}`
  }
  return t.replace(/\D/g, '')
}
