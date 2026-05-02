import request from 'supertest'
import type { Express } from 'express'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  zone: { findFirst: vi.fn() },
  alert: { findFirst: vi.fn() },
  hospitalAlertAck: { create: vi.fn() },
  alertEvent: { create: vi.fn() },
  outboundMessage: { create: vi.fn(), updateMany: vi.fn() },
}))

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))

describe('cookie dashboard auth and CSRF', () => {
  let createApp: () => Express
  let signHospitalPortalToken: (hospitalId: string) => string

  beforeAll(async () => {
    const appMod = await import('@/app')
    const portalMod = await import('@/lib/portalJwt')
    createApp = appMod.createApp
    signHospitalPortalToken = portalMod.signHospitalPortalToken
  })

  beforeEach(() => {
    process.env.PORTAL_JWT_SECRET = 'test-portal-secret-with-32-chars'
    process.env.CLIENT_URL = 'http://localhost:5173'
    process.env.TWILIO_MOCK = 'true'
    vi.clearAllMocks()
  })

  it('exchanges a hospital portal token for HttpOnly auth and readable CSRF cookies', async () => {
    const token = signHospitalPortalToken('11111111-1111-4111-8111-111111111111')

    const res = await request(createApp()).post('/api/hospital/session').send({ token }).expect(200)
    const cookies = res.headers['set-cookie'] as unknown as string[]

    expect(cookies.some((cookie) => cookie.startsWith('mama_hospital_portal=') && cookie.includes('HttpOnly'))).toBe(
      true,
    )
    expect(cookies.some((cookie) => cookie.startsWith('mama_csrf='))).toBe(true)
  })

  it('rejects cookie-authenticated dashboard mutations without a matching CSRF header', async () => {
    const token = signHospitalPortalToken('11111111-1111-4111-8111-111111111111')
    const app = createApp()
    const session = await request(app).post('/api/hospital/session').send({ token }).expect(200)
    const cookieHeader = (session.headers['set-cookie'] as unknown as string[]).map((cookie) => cookie.split(';')[0]).join('; ')

    await request(app).post('/api/hospital/ack').set('Cookie', cookieHeader).send({
      alertId: '22222222-2222-4222-8222-222222222222',
      type: 'ready',
    }).expect(403)
  })

  it('accepts cookie-authenticated dashboard mutations with CSRF', async () => {
    const token = signHospitalPortalToken('11111111-1111-4111-8111-111111111111')
    const app = createApp()
    const session = await request(app).post('/api/hospital/session').send({ token }).expect(200)
    const cookies = session.headers['set-cookie'] as unknown as string[]
    const cookieHeader = cookies.map((cookie) => cookie.split(';')[0]).join('; ')
    const csrf = cookies
      .map((cookie) => cookie.split(';')[0])
      .find((cookie) => (cookie ?? '').startsWith('mama_csrf='))
      ?.slice('mama_csrf='.length)

    prismaMock.alert.findFirst.mockResolvedValue({ id: '22222222-2222-4222-8222-222222222222' })
    prismaMock.hospitalAlertAck.create.mockResolvedValue({})
    prismaMock.alertEvent.create.mockResolvedValue({})

    await request(app)
      .post('/api/hospital/ack')
      .set('Cookie', cookieHeader)
      .set('X-CSRF-Token', csrf ?? '')
      .send({ alertId: '22222222-2222-4222-8222-222222222222', type: 'ready' })
      .expect(200)

    expect(prismaMock.hospitalAlertAck.create).toHaveBeenCalled()
  })

  it('records Twilio SMS delivery callbacks', async () => {
    prismaMock.outboundMessage.updateMany.mockResolvedValue({ count: 1 })

    await request(createApp())
      .post('/api/sms-status')
      .type('form')
      .send({
        MessageSid: 'SM123',
        MessageStatus: 'delivered',
        To: '+15550000001',
        From: '+15550000002',
      })
      .expect(200)

    expect(prismaMock.outboundMessage.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { providerMessageId: 'SM123' },
        data: expect.objectContaining({ status: 'delivered' }),
      }),
    )
  })
})
