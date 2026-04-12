import 'dotenv/config'
import { validateEnv } from '@/config/env'
validateEnv()

import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { adminDataRouter } from '@/routes/adminData'
import { alertsRouter } from '@/routes/alerts'
import { authRouter } from '@/routes/auth'
import { hospitalPortalRouter } from '@/routes/hospitalPortal'
import { registerRouter } from '@/routes/register'
import { volunteerPortalRouter } from '@/routes/volunteerPortal'
import { smsReplyRouter } from '@/routes/smsReply'
import { sosRouter } from '@/routes/sos'
import { statusRouter } from '@/routes/status'
import { ussdRouter } from '@/routes/ussd'
import { generalRateLimit, patientHintsRateLimit, sosRateLimit } from '@/middleware/rateLimiter'
import { publicPatientRouter } from '@/routes/publicPatient'
import { workerPortalRouter } from '@/routes/workerPortal'
import { validateTwilioUssdSignature } from '@/middleware/twilioValidate'
import { logError } from '@/lib/logger'
import { startDelayedJobPoller } from '@/services/delayedJobProcessor'
import { prisma } from '@/lib/prisma'

const app = express()
const PORT = Number(process.env.PORT) || 3000

// Railway / other reverse proxies send X-Forwarded-For; required for express-rate-limit client IPs
const trustProxyHops = Number.parseInt(process.env.TRUST_PROXY_HOPS ?? '1', 10)
app.set('trust proxy', Number.isFinite(trustProxyHops) && trustProxyHops > 0 ? trustProxyHops : 1)

app.use(helmet())
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    methods: ['GET', 'POST', 'PATCH'],
    credentials: true,
  }),
)
app.use(generalRateLimit)
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use('/api/public', patientHintsRateLimit, publicPatientRouter)

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

/** Confirms service role can reach Postgres. Requires `X-Health-Db-Token` matching `HEALTH_DB_TOKEN` when set. */
app.get('/api/health/db', async (req, res) => {
  const expected = process.env.HEALTH_DB_TOKEN
  if (expected && expected.length > 0) {
    const got = req.headers['x-health-db-token']
    if (got !== expected) {
      return res.status(404).json({ ok: false })
    }
  }
  try {
    await prisma.zone.findFirst({ select: { id: true } })
  } catch (err) {
    logError('Health DB check failed', { error: String(err) })
    return res.status(503).json({ ok: false, database: 'error' })
  }
  return res.json({ ok: true, database: 'reachable' })
})

app.use('/api/sos', sosRateLimit, sosRouter)
app.use('/api/sms-reply', smsReplyRouter)
app.use('/api/ussd', validateTwilioUssdSignature, ussdRouter)
app.use('/api/register', registerRouter)
app.use('/api/volunteer', volunteerPortalRouter)
app.use('/api/hospital', hospitalPortalRouter)
app.use('/api/admin', adminDataRouter)
app.use('/api/alerts', alertsRouter)
app.use('/api/worker', workerPortalRouter)
app.use('/api', authRouter)
app.use('/api/status', statusRouter)

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logError('Unhandled error', { err: String(err) })
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`MamaAlert server running on port ${PORT}`)
  startDelayedJobPoller()
})
