import { logError } from '@/lib/logger'
import { loadEscalationConfig, runEscalationTimer } from '@/services/escalation'
import { runIncapacitationStep } from '@/services/incapacitationTimer'
import { supabaseAdmin } from '@/services/supabase'

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
  job_type: string
  payload: unknown
}): Promise<void> {
  if (job.job_type === 'escalation') {
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
  if (job.job_type === 'incapacitation') {
    const p = job.payload as { alertId?: string; patientId?: string }
    if (typeof p.alertId !== 'string' || typeof p.patientId !== 'string') {
      return
    }
    await runIncapacitationStep(p.alertId, p.patientId)
  }
}

async function tickOnce(): Promise<void> {
  const now = new Date().toISOString()
  const { data: jobs, error } = await supabaseAdmin
    .from('delayed_jobs')
    .select('id, job_type, payload')
    .lte('run_after', now)
    .is('locked_at', null)
    .order('run_after', { ascending: true })
    .limit(25)

  if (error) {
    if (String(error.message).includes('does not exist') || String(error.code) === '42P01') {
      return
    }
    logError('delayedJob: list failed', { error: String(error) })
    return
  }

  for (const job of jobs ?? []) {
    const lockIso = new Date().toISOString()
    const { data: locked, error: lockErr } = await supabaseAdmin
      .from('delayed_jobs')
      .update({ locked_at: lockIso })
      .eq('id', job.id)
      .is('locked_at', null)
      .select('id')
      .maybeSingle()

    if (lockErr || !locked) {
      continue
    }

    try {
      await processJobRow(job)
    } catch (err) {
      logError('delayedJob: handler failed', { jobId: job.id, err: String(err) })
    } finally {
      await supabaseAdmin.from('delayed_jobs').delete().eq('id', job.id)
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
