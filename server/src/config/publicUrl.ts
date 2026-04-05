/** PWA origin for links in SMS (family status page). Falls back to CLIENT_URL. */
export function getPublicAppUrl(): string {
  const base = process.env.PUBLIC_APP_URL ?? process.env.CLIENT_URL ?? ''
  return base.replace(/\/$/, '')
}

export function statusPageUrl(statusToken: string): string {
  const t = String(statusToken).trim()
  return `${getPublicAppUrl()}/status/${encodeURIComponent(t)}`
}
