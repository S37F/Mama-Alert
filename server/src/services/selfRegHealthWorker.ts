import { prisma } from '@/lib/prisma'

/**
 * Self-registered patients need a `health_worker_id`. Prefer any field worker in the chosen zone,
 * then any staff row in that zone (e.g. zone admin); then `SELF_REG_DEFAULT_HEALTH_WORKER_ID`.
 * `ensureAssignableHealthWorkerId` creates a placeholder row if all of the above fail.
 */
export async function resolveSelfRegHealthWorkerId(zoneId: string): Promise<string | null> {
  const fieldWorker = await prisma.healthWorker.findFirst({
    where: { zoneId, accessLevel: 'health_worker' },
    orderBy: { createdAt: 'asc' },
    select: { userId: true },
  })
  if (fieldWorker) {
    return fieldWorker.userId
  }

  const anyInZone = await prisma.healthWorker.findFirst({
    where: { zoneId },
    orderBy: { createdAt: 'asc' },
    select: { userId: true },
  })
  if (anyInZone) {
    return anyInZone.userId
  }

  const fallback = process.env.SELF_REG_DEFAULT_HEALTH_WORKER_ID?.trim()
  if (!fallback) {
    return null
  }
  const row = await prisma.healthWorker.findUnique({
    where: { userId: fallback },
    select: { userId: true },
  })
  return row?.userId ?? null
}
