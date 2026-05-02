import { prisma } from '@/lib/prisma'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isUuid(value: string): boolean {
  return UUID_RE.test(value)
}

/** Resolve zone for self-service patient/clinic signup. Prefer explicit id, then name match; else env or single-zone deploy. */
export async function resolvePublicRegistrationZoneId(input: {
  zone_id?: string | null | undefined
  zone_name?: string | null | undefined
}): Promise<{ ok: true; zoneId: string } | { ok: false; error: string }> {
  const rawId = (input.zone_id ?? '').trim()
  if (rawId && isUuid(rawId)) {
    const row = await prisma.zone.findUnique({ where: { id: rawId }, select: { id: true } })
    if (row) {
      return { ok: true, zoneId: row.id }
    }
  }

  const name = (input.zone_name ?? '').trim()
  if (name.length >= 2) {
    const exact = await prisma.zone.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
      select: { id: true },
    })
    if (exact) {
      return { ok: true, zoneId: exact.id }
    }

    const candidates = await prisma.zone.findMany({
      where: { name: { contains: name, mode: 'insensitive' } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
      take: 8,
    })
    if (candidates.length === 1) {
      return { ok: true, zoneId: candidates[0]!.id }
    }
    if (candidates.length > 1) {
      return {
        ok: false,
        error: `Several areas match "${name}". Choose one from the list above or type the full program name.`,
      }
    }

    return {
      ok: false,
      error: `No area named "${name}" was found. Check spelling or ask your coordinator for the exact program name.`,
    }
  }

  const envId = process.env.SELF_REG_DEFAULT_ZONE_ID?.trim()
  if (envId && isUuid(envId)) {
    const row = await prisma.zone.findUnique({ where: { id: envId }, select: { id: true } })
    if (row) {
      return { ok: true, zoneId: row.id }
    }
  }

  const zoneCount = await prisma.zone.count()
  if (zoneCount === 1) {
    const only = await prisma.zone.findFirst({ select: { id: true }, orderBy: { name: 'asc' } })
    if (only) {
      return { ok: true, zoneId: only.id }
    }
  }

  return {
    ok: false,
    error:
      'Enter your local program / area name (as given by your coordinator), configure SELF_REG_DEFAULT_ZONE_ID, or ask an admin to add zones.',
  }
}
