import { prisma } from '@/lib/prisma'

/**
 * Self-registered patients need a `health_worker_id`. Prefer any field worker in the chosen zone;
 * fall back to `SELF_REG_DEFAULT_HEALTH_WORKER_ID` (must exist in `health_workers`).
 */
export async function resolveSelfRegHealthWorkerId(zoneId: string): Promise<string | null> {
  const inZone = await prisma.healthWorker.findFirst({
    where: { zoneId, accessLevel: 'health_worker' },
    orderBy: { createdAt: 'asc' },
    select: { userId: true },
  })
  if (inZone) {
    return inZone.userId
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
