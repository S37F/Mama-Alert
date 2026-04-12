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
      cfg = { delayMs: defaultEscalationDelayMs(), r1: 10_000, r2: 20_000 }
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
  let jobs: { id: string; jobType: string; payload: unknown }[] = []
  try {
    jobs = await prisma.delayedJob.findMany({
      where: { runAfter: { lte: now }, lockedAt: null },
      orderBy: { runAfter: 'asc' },
      take: 25,
      select: { id: true, jobType: true, payload: true },
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
        where: { id: job.id, lockedAt: null },
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
    } catch (err) {
      logError('delayedJob: handler failed', { jobId: job.id, err: String(err) })
    } finally {
      try {
        await prisma.delayedJob.delete({ where: { id: job.id } })
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
