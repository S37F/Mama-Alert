/** Keep SMS in a single GSM-03.38 segment when possible (160 chars). */
export function truncateSms(text: string, max = 160): string {
  if (text.length <= max) {
    return text
  }
  const cut = max - 3
  return `${text.slice(0, Math.max(0, cut))}...`
}

/** Multipart GSM-7: 153 chars per part when concatenated. */
const PART = 153
const MAX_TWO_PART = PART * 2

export function truncateSmsTwoPart(text: string): string {
  if (text.length <= MAX_TWO_PART) {
    return text
  }
  return `${text.slice(0, MAX_TWO_PART - 3)}...`
}

export function splitSmsTwoParts(text: string): [string] | [string, string] {
  const t = truncateSmsTwoPart(text)
  if (t.length <= 160) {
    return [t]
  }
  return [t.slice(0, PART), t.slice(PART)]
}
