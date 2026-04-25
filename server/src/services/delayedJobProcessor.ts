import { Prisma } from '@prisma/client'
import { logError } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
import { loadEscalationConfig, runEscalationTimer } from '@/services/escalation'
import { runIncapacitationStep } from '@/services/incapacitationTimer'

function defaultEscalationDelayMs(): number {
  const raw = process.env.ESCALATION_DELAY_MS
  if (raw === undefined || raw === '') {
    return 5 * 60 * 1000
  }
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) && n > 0 ? n : 5 * 60 * 1000
}

async function processJobRow(job: {
  id: string
  jobType: string
  payload: unknown
}): Promise<void> {
  if (job.jobType === 'escalation') {
    const p = job.payload as { alertId?: string; patientId?: string; wave?: number }
    if (typeof p.alertId !== 'string' || typeof p.patientId !== 'string' || typeof p.wave !== 'number') {
      return
    }
    let cfg
    try {
      cfg = await loadEscalationConfig(p.patientId)
    } catch (err) {
      logError('delayedJob: loadEscalationConfig failed', { err: String(err) })
      cfg = { delayMs: defaultEscalationDelayMs(), r1: 10_000, r2: 20_000, r3: 50_000 }
    }
    await runEscalationTimer(p.alertId, p.patientId, p.wave, cfg)
    return
  }
  if (job.jobType === 'incapacitation') {
    const p = job.payload as { alertId?: string; patientId?: string }
    if (typeof p.alertId !== 'string' || typeof p.patientId !== 'string') {
      return
    }
    await runIncapacitationStep(p.alertId, p.patientId)
  }
}

function isMissingTableError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2021'
}

async function tickOnce(): Promise<void> {
  const now = new Date()
  const staleLockedBefore = new Date(Date.now() - 2 * 60 * 1000)
  let jobs: { id: string; jobType: string; payload: unknown; attempts: number }[] = []
  try {
    jobs = await prisma.delayedJob.findMany({
      where: {
        runAfter: { lte: now },
        OR: [{ lockedAt: null }, { lockedAt: { lt: staleLockedBefore } }],
      },
      orderBy: { runAfter: 'asc' },
      take: 25,
      select: { id: true, jobType: true, payload: true, attempts: true },
    })
  } catch (err) {
    if (isMissingTableError(err)) {
      return
    }
    logError('delayedJob: list failed', { error: String(err) })
    return
  }

  for (const job of jobs) {
    const lockIso = new Date()
    try {
      const locked = await prisma.delayedJob.updateMany({
        where: {
          id: job.id,
          OR: [{ lockedAt: null }, { lockedAt: { lt: staleLockedBefore } }],
        },
        data: { lockedAt: lockIso },
      })
      if (locked.count === 0) {
        continue
      }
    } catch (err) {
      continue
    }

    try {
      await processJobRow(job)
      await prisma.delayedJob.delete({ where: { id: job.id } })
    } catch (err) {
      logError('delayedJob: handler failed', { jobId: job.id, err: String(err) })
      try {
        const attempts = job.attempts + 1
        const backoffMs = Math.min(5 * 60 * 1000, 10_000 * 2 ** Math.min(attempts, 5))
        await prisma.delayedJob.update({
          where: { id: job.id },
          data: {
            attempts,
            lastError: String(err).slice(0, 1000),
            lockedAt: null,
            runAfter: new Date(Date.now() + backoffMs),
          },
        })
      } catch (updateErr) {
        logError('delayedJob: retry update failed', { jobId: job.id, err: String(updateErr) })
      }
    } finally {
      try {
        await prisma.delayedJob.updateMany({
          where: { id: job.id, lockedAt: lockIso },
          data: { lockedAt: null },
        })
      } catch {
        /* ignore */
      }
    }
  }
}

/** Poll DB for due delayed jobs (escalation + incapacitation). Safe with multiple instances (row lock). */
export function startDelayedJobPoller(): void {
  const intervalMs = 5000
  setInterval(() => {
    void tickOnce()
  }, intervalMs)
  void tickOnce()
}
