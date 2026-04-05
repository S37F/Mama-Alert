/** Comma-separated keywords in SMS body to trigger SOS (case-insensitive). */
export function getSmsSosKeywordSet(): Set<string> {
  const raw = process.env.SMS_SOS_KEYWORDS ?? 'HELP,SOS,EMERGENCY'
  const set = new Set<string>()
  for (const part of raw.split(',')) {
    const k = part.trim().toUpperCase()
    if (k.length > 0) {
      set.add(k)
    }
  }
  return set
}

export function bodyMatchesSosKeyword(body: string, keywords: Set<string>): boolean {
  const t = body.trim().toUpperCase()
  if (t.length === 0) {
    return false
  }
  if (keywords.has(t)) {
    return true
  }
  const first = t.split(/\s+/)[0] ?? ''
  return keywords.has(first)
}
