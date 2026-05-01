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
import { smsStatusRouter } from '@/routes/smsStatus'
import { sosRouter } from '@/routes/sos'
import { statusRouter } from '@/routes/status'
import { ussdRouter } from '@/routes/ussd'
import { generalRateLimit, patientHintsRateLimit, sosRateLimit } from '@/middleware/rateLimiter'
import { publicPatientRouter } from '@/routes/publicPatient'
import { publicPatientAccessRouter } from '@/routes/publicPatientAccess'
import { workerPortalRouter } from '@/routes/workerPortal'
import { validateTwilioUssdSignature } from '@/middleware/twilioValidate'
import { csrfProtection } from '@/middleware/csrf'
import { requestContextMiddleware } from '@/lib/requestContext'
import { logError } from '@/lib/logger'
import { prisma } from '@/lib/prisma'

function normalizeOrigin(value: string): string {
  const trimmed = value.trim().replace(/\/$/, '')
  try {
    return new URL(trimmed).origin
  } catch {
    return trimmed
  }
}

function getAllowedOrigins(): Set<string> {
  const raw = [process.env.CLIENT_URL, process.env.CLIENT_ORIGINS].filter(Boolean).join(',')
  const origins = new Set<string>()

  raw
    .split(',')
    .map((value) => normalizeOrigin(value))
    .filter(Boolean)
    .forEach((origin) => {
      origins.add(origin)

      try {
        const url = new URL(origin)
        if (url.hostname.startsWith('www.')) {
          url.hostname = url.hostname.slice(4)
          origins.add(url.origin)
        } else if (url.hostname.includes('.')) {
          url.hostname = `www.${url.hostname}`
          origins.add(url.origin)
        }
      } catch {
        // Keep the original normalized value for non-URL origins.
      }
    })

  return origins
}

export function createApp(): express.Express {
  const app = express()

  // Render / other reverse proxies send X-Forwarded-For; required for express-rate-limit client IPs.
  const trustProxyHops = Number.parseInt(process.env.TRUST_PROXY_HOPS ?? '1', 10)
  app.set('trust proxy', Number.isFinite(trustProxyHops) && trustProxyHops > 0 ? trustProxyHops : 1)
  const allowedOrigins = getAllowedOrigins()
  const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true)
        return
      }
      callback(null, allowedOrigins.has(normalizeOrigin(origin)))
    },
    methods: ['GET', 'HEAD', 'POST', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Health-Db-Token', 'X-CSRF-Token', 'X-Request-ID'],
    credentials: true,
    optionsSuccessStatus: 204,
  }

  app.use(requestContextMiddleware)
  app.use(helmet())
  app.use(cors(corsOptions))
  app.options('*', cors(corsOptions))
  app.use(generalRateLimit)
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))
  app.use(csrfProtection)
  app.use('/api/public', patientHintsRateLimit, publicPatientRouter, publicPatientAccessRouter)

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
  app.use('/api/sms-status', smsStatusRouter)
  app.use('/api/ussd', validateTwilioUssdSignature, ussdRouter)
  app.use('/api/register', registerRouter)
  app.use('/api/volunteer', volunteerPortalRouter)
  app.use('/api/hospital', hospitalPortalRouter)
  app.use('/api/admin', adminDataRouter)
  app.use('/api/alerts', alertsRouter)
  app.use('/api/worker', workerPortalRouter)
  app.use('/api/auth', authRouter)
  app.use('/api/status', statusRouter)

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logError('Unhandled error', { err: String(err) })
    const statusCode =
      err &&
      typeof err === 'object' &&
      'statusCode' in err &&
      typeof (err as { statusCode: unknown }).statusCode === 'number'
        ? (err as { statusCode: number }).statusCode
        : 500
    const message =
      statusCode >= 400 && statusCode < 500 && err instanceof Error ? err.message : 'Internal server error'
    res.status(statusCode).json({ error: message })
  })

  return app
}
