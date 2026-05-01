import { randomUUID } from 'crypto'
import { AsyncLocalStorage } from 'async_hooks'
import type { NextFunction, Request, Response } from 'express'

type RequestContext = {
  requestId: string
}

const storage = new AsyncLocalStorage<RequestContext>()

export function getRequestId(): string | undefined {
  return storage.getStore()?.requestId
}

export function requestContextMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.headers['x-request-id']
  const requestId = typeof incoming === 'string' && incoming.trim().length > 0 ? incoming.trim().slice(0, 128) : randomUUID()
  req.requestId = requestId
  res.setHeader('X-Request-ID', requestId)
  storage.run({ requestId }, next)
}
