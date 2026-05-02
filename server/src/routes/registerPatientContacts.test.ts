import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const HEALTH_WORKER_ID = '11111111-1111-4111-8111-111111111111'
const ZONE_ID = '22222222-2222-4222-8222-222222222222'
const PATIENT_ID = '33333333-3333-4333-8333-333333333333'

const prismaMock = vi.hoisted(() => ({
  healthWorker: { findUnique: vi.fn() },
  zone: { findFirst: vi.fn() },
}))

const insertPatientWithLocationMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))

vi.mock('@/services/db/geoWrites', () => ({
  insertPatientWithLocation: insertPatientWithLocationMock,
  insertHospitalWithLocation: vi.fn(),
  insertVolunteerWithLocation: vi.fn(),
}))

vi.mock('@/services/familyWelcomeOnRegister', () => ({
  sendFamilyWelcomeSmsIfEnabled: vi.fn(),
}))

vi.mock('@/services/twilio', () => ({
  sendSmsMultipart: vi.fn(),
}))

type Contact = {
  name: string
  phone: string
  relationship: 'husband' | 'mother' | 'sister' | 'neighbour' | 'other'
}

function contacts(count: number): Contact[] {
  return Array.from({ length: count }, (_, index) => ({
    name: `Contact ${index + 1}`,
    phone: `+1555000000${index + 1}`,
    relationship: index === 0 ? 'husband' : 'mother',
  }))
}

function patientPayload(emergencyContacts: Contact[]) {
  return {
    name: 'Test Patient',
    age: 28,
    phone_primary: '+15551112222',
    phone_secondary: null,
    village: 'Test Village',
    landmark: 'Clinic Road',
    lat: 18.5204,
    lng: 73.8567,
    weeks_pregnant: 30,
    due_date: null,
    prev_pregnancies: 1,
    prev_births: 0,
    prev_csection: false,
    last_anc_date: null,
    blood_type: 'O+',
    language: 'en',
    zone_id: ZONE_ID,
    risk_flags: [],
    medication_name: null,
    emergency_contacts: emergencyContacts,
  }
}

describe('patient registration emergency contacts', () => {
  beforeEach(() => {
    process.env.CLIENT_URL = 'http://localhost:5173'
    process.env.PORTAL_JWT_SECRET = 'test-portal-secret-with-32-chars'
    process.env.SOS_SIGNING_SECRET = 'test-sos-secret-with-32-chars'
    process.env.TWILIO_MOCK = 'true'
    vi.clearAllMocks()
    prismaMock.healthWorker.findUnique.mockResolvedValue({
      accessLevel: 'health_worker',
      zoneId: ZONE_ID,
    })
    insertPatientWithLocationMock.mockResolvedValue({
      id: PATIENT_ID,
      status_token: 'status-token-test',
    })
  })

  async function postPatient(emergencyContacts: Contact[]) {
    const { createApp } = await import('@/app')
    const { signMamaSessionToken } = await import('@/lib/sessionToken')
    const token = signMamaSessionToken(HEALTH_WORKER_ID, 'health_worker')
    return request(createApp())
      .post('/api/register/patient')
      .set('Authorization', `Bearer ${token}`)
      .send(patientPayload(emergencyContacts))
  }

  it('accepts exactly one emergency contact', async () => {
    const res = await postPatient(contacts(1))

    expect(res.status).toBe(201)

    expect(insertPatientWithLocationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        emergencyContacts: contacts(1),
      }),
    )
  })

  it('accepts up to four emergency contacts', async () => {
    const res = await postPatient(contacts(4))

    expect(res.status).toBe(201)

    expect(insertPatientWithLocationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        emergencyContacts: contacts(4),
      }),
    )
  })

  it('rejects zero emergency contacts', async () => {
    const res = await postPatient([])

    expect(res.status).toBe(400)

    expect(insertPatientWithLocationMock).not.toHaveBeenCalled()
  })

  it('rejects more than four emergency contacts', async () => {
    const res = await postPatient(contacts(5))

    expect(res.status).toBe(400)

    expect(insertPatientWithLocationMock).not.toHaveBeenCalled()
  })
})
