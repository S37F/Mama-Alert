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
import { logError } from '@/lib/logger'

const app = express()
const PORT = Number(process.env.PORT) || 3000

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

app.use('/api/sos', sosRateLimit, sosRouter)
app.use('/api/sms-reply', smsReplyRouter)
app.use('/api/ussd', ussdRouter)
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
})
