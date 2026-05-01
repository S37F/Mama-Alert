import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  prisma: {
    delayedJob: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
    },
  },
  loadEscalationConfig: vi.fn(),
  runEscalationTimer: vi.fn(),
  runIncapacitationStep: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({ prisma: mocks.prisma }))
vi.mock('@/services/escalation', () => ({
  loadEscalationConfig: mocks.loadEscalationConfig,
  runEscalationTimer: mocks.runEscalationTimer,
}))
vi.mock('@/services/incapacitationTimer', () => ({
  runIncapacitationStep: mocks.runIncapacitationStep,
}))

describe('delayed job processor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('backs off and records handler errors without deleting failed jobs', async () => {
    mocks.prisma.delayedJob.findMany.mockResolvedValue([
      {
        id: 'job-1',
        jobType: 'escalation',
        payload: {
          alertId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
          patientId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          wave: 1,
        },
        attempts: 2,
      },
    ])
    mocks.prisma.delayedJob.updateMany.mockResolvedValue({ count: 1 })
    mocks.loadEscalationConfig.mockResolvedValue({ delayMs: 1000, r1: 5000, r2: 10000, r3: 20000 })
    mocks.runEscalationTimer.mockRejectedValue(new Error('boom'))
    mocks.prisma.delayedJob.update.mockResolvedValue({})

    const { runDelayedJobTickForTest } = await import('@/services/delayedJobProcessor')
    await runDelayedJobTickForTest()

    expect(mocks.prisma.delayedJob.delete).not.toHaveBeenCalled()
    expect(mocks.prisma.delayedJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'job-1' },
        data: expect.objectContaining({
          attempts: 3,
          lockedAt: null,
          lastError: expect.stringContaining('boom'),
        }),
      }),
    )
  })
})
