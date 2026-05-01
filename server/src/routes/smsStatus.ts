import { Router } from 'express'
import { asyncHandler } from '@/lib/asyncHandler'
import { markOutboundMessageStatus } from '@/services/observability'
import { validateStatusWebhookSignature } from '@/services/twilio'

export const smsStatusRouter = Router()

smsStatusRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    if (!validateStatusWebhookSignature(req)) {
      res.status(403).send('Forbidden')
      return
    }
    const sid = typeof req.body?.MessageSid === 'string' ? req.body.MessageSid : ''
    const status = typeof req.body?.MessageStatus === 'string' ? req.body.MessageStatus : ''
    if (sid && status) {
      await markOutboundMessageStatus({
        providerMessageId: sid,
        status,
        error: typeof req.body?.ErrorMessage === 'string' ? req.body.ErrorMessage : null,
        metadata: {
          errorCode: typeof req.body?.ErrorCode === 'string' ? req.body.ErrorCode : null,
          to: typeof req.body?.To === 'string' ? req.body.To : null,
          from: typeof req.body?.From === 'string' ? req.body.From : null,
        },
      })
    }
    res.type('text/xml').send('<Response></Response>')
  }),
)
