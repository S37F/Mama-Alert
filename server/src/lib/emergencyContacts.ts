import { normalizePhone } from '@/lib/phone'

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

function normalizedPatientPhones(primary: string, secondary?: string | null): Set<string> {
  const s = new Set<string>()
  const a = normalizePhone(primary.trim())
  if (a.length > 0) {
    s.add(a)
  }
  if (typeof secondary === 'string' && secondary.trim().length > 0) {
    const b = normalizePhone(secondary.trim())
    if (b.length > 0) {
      s.add(b)
    }
  }
  return s
}

/**
 * Emergency-contact numbers for outbound texts, deduped and excluding the patient's own line(s).
 * Avoids duplicate SMS when the patient's number is saved as a trusted contact.
 */
export function extractFamilyNotifyPhones(
  contacts: unknown,
  patientPhonePrimary: string,
  patientPhoneSecondary?: string | null,
): string[] {
  const exclude = normalizedPatientPhones(patientPhonePrimary, patientPhoneSecondary)
  const raw = extractFamilyPhones(contacts)
  const out: string[] = []
  const seenNorm = new Set<string>()
  for (const ph of raw) {
    const norm = normalizePhone(ph)
    if (norm.length === 0 || exclude.has(norm) || seenNorm.has(norm)) {
      continue
    }
    seenNorm.add(norm)
    out.push(ph.trim())
  }
  return out
}
