import type { NextFunction, Request, Response } from 'express'
import { validateUssdWebhookSignature, validateWebhookSignature } from '@/services/twilio'

export function validateTwilioSignature(req: Request, res: Response, next: NextFunction): void {
  if (!validateWebhookSignature(req)) {
    res.status(403).send('Forbidden')
    return
  }
  next()
}

export function validateTwilioUssdSignature(req: Request, res: Response, next: NextFunction): void {
  if (!validateUssdWebhookSignature(req)) {
    res.status(403).send('Forbidden')
    return
  }
  next()
}
