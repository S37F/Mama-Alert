export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** Phones from `patients.emergency_contacts` JSON array. */
export function extractFamilyPhones(contacts: unknown): string[] {
  if (!Array.isArray(contacts)) {
    return []
  }
  const out: string[] = []
  for (const c of contacts) {
    if (isRecord(c) && typeof c.phone === 'string' && c.phone.trim().length > 0) {
      out.push(c.phone.trim())
    }
  }
  return out
}
