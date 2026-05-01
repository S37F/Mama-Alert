import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PatientSosRow } from '@/types/patientSos'

const mocks = vi.hoisted(() => ({
  prisma: {
    alertResponse: { create: vi.fn() },
    delayedJob: { create: vi.fn() },
    alertEvent: { create: vi.fn() },
    outboundMessage: { create: vi.fn() },
  },
  rpcInsertSosAlertIfAllowed: vi.fn(),
  getNearbyVolunteers: vi.fn(),
  sendSmsMultipart: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({ prisma: mocks.prisma }))
vi.mock('@/services/db/rpc', () => ({ rpcInsertSosAlertIfAllowed: mocks.rpcInsertSosAlertIfAllowed }))
vi.mock('@/services/geo', () => ({ getNearbyVolunteers: mocks.getNearbyVolunteers }))
vi.mock('@/services/twilio', () => ({
  sendSMS: vi.fn(),
  sendSmsMultipart: mocks.sendSmsMultipart,
  sendVoiceConfirmation: vi.fn(),
}))
vi.mock('@/services/volunteerSseHub', () => ({ notifyVolunteerFeedRefresh: vi.fn() }))

const patientRow: PatientSosRow = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  name: 'Priya Test',
  phone_primary: '+15550000001',
  language: 'en',
  landmark: 'Clinic road',
  blood_type: null,
  lat: 18.52,
  lng: 73.85,
  zone_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  health_worker_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  emergency_contacts: [],
  status_token: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  risk_flags: [],
  weeks_pregnant: 32,
  registration_verified: true,
}

describe('triggerSosFromPatientRow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.PORTAL_JWT_SECRET = 'test-portal-secret-with-32-chars'
  })

  it('creates alert responses and sends volunteer messages for a new SOS', async () => {
    mocks.rpcInsertSosAlertIfAllowed.mockResolvedValue({
      ok: true,
      alert_id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    })
    mocks.getNearbyVolunteers.mockResolvedValue([
      {
        id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
        name: 'Ravi',
        phone: '+15550000002',
        language: 'en',
        zone_id: patientRow.zone_id,
        skills: [],
      },
    ])
    mocks.prisma.alertResponse.create.mockResolvedValue({})
    mocks.prisma.delayedJob.create.mockResolvedValue({})
    mocks.prisma.alertEvent.create.mockResolvedValue({})
    mocks.sendSmsMultipart.mockResolvedValue(undefined)

    const { triggerSosFromPatientRow } = await import('@/services/sosService')
    const result = await triggerSosFromPatientRow(patientRow, 'pwa')

    expect(result).toEqual({
      success: true,
      alertId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      volunteersNotified: 1,
    })
    expect(mocks.prisma.alertResponse.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          alertId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
          volunteerId: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
        }),
      }),
    )
    expect(mocks.sendSmsMultipart).toHaveBeenCalledWith(
      '+15550000002',
      expect.any(String),
      { alertId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee' },
    )
  })

  it('acknowledges duplicate SOS without creating another fan-out', async () => {
    mocks.rpcInsertSosAlertIfAllowed.mockResolvedValue({
      ok: false,
      reason: 'duplicate',
      alert_id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    })
    mocks.prisma.alertEvent.create.mockResolvedValue({})

    const { triggerSosFromPatientRow } = await import('@/services/sosService')
    const result = await triggerSosFromPatientRow(patientRow, 'pwa')

    expect(result).toEqual({
      success: true,
      alertId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      volunteersNotified: 0,
      duplicate: true,
    })
    expect(mocks.getNearbyVolunteers).not.toHaveBeenCalled()
    expect(mocks.sendSmsMultipart).not.toHaveBeenCalled()
  })
})
