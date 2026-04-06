/**
 * Server-Sent Events for phone-identified volunteers (no Supabase JWT on the volunteer PWA).
 * Pushes lightweight refresh signals when feed-relevant data changes.
 */
import type { Request, Response } from 'express'
import { normalizePhone } from '@/lib/phone'

type SseClient = {
  res: Response
  heartbeat: ReturnType<typeof setInterval>
}

const subscribers = new Map<string, Set<SseClient>>()

function getSet(phoneKey: string): Set<SseClient> {
  let s = subscribers.get(phoneKey)
  if (!s) {
    s = new Set()
    subscribers.set(phoneKey, s)
  }
  return s
}

/** Subscribe `res` to feed refresh events for this normalized phone. Caller must validate phone first. */
export function registerVolunteerSse(req: Request, res: Response, phoneRaw: string): void {
  const phoneKey = normalizePhone(phoneRaw)

  res.status(200)
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders()
  }

  const heartbeat = setInterval(() => {
    try {
      res.write(': ping\n\n')
    } catch {
      // connection closed
    }
  }, 25_000)

  const client: SseClient = { res, heartbeat }
  const set = getSet(phoneKey)
  set.add(client)

  res.write('event: connected\ndata: {}\n\n')

  const cleanup = (): void => {
    clearInterval(heartbeat)
    set.delete(client)
    if (set.size === 0) {
      subscribers.delete(phoneKey)
    }
  }

  req.on('close', cleanup)
  res.on('close', cleanup)
}

export function notifyVolunteerFeedRefresh(phoneRaw: string): void {
  const phoneKey = normalizePhone(phoneRaw)
  const set = subscribers.get(phoneKey)
  if (!set || set.size === 0) {
    return
  }
  const dead: SseClient[] = []
  for (const c of set) {
    try {
      c.res.write('event: feed_refresh\ndata: {}\n\n')
    } catch {
      dead.push(c)
    }
  }
  for (const c of dead) {
    clearInterval(c.heartbeat)
    set.delete(c)
  }
  if (set.size === 0) {
    subscribers.delete(phoneKey)
  }
}
