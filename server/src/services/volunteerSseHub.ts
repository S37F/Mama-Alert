/**
 * Server-Sent Events keyed by volunteer id (portal JWT identifies the volunteer).
 */
import type { Request, Response } from 'express'

type SseClient = {
  res: Response
  heartbeat: ReturnType<typeof setInterval>
}

const subscribers = new Map<string, Set<SseClient>>()

function getSet(volunteerId: string): Set<SseClient> {
  let s = subscribers.get(volunteerId)
  if (!s) {
    s = new Set()
    subscribers.set(volunteerId, s)
  }
  return s
}

/** Subscribe `res` to feed refresh events for this volunteer. Caller must validate identity first. */
export function registerVolunteerSse(req: Request, res: Response, volunteerId: string): void {
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
  const set = getSet(volunteerId)
  set.add(client)

  res.write('event: connected\ndata: {}\n\n')

  const cleanup = (): void => {
    clearInterval(heartbeat)
    set.delete(client)
    if (set.size === 0) {
      subscribers.delete(volunteerId)
    }
  }

  req.on('close', cleanup)
  res.on('close', cleanup)
}

export function notifyVolunteerFeedRefresh(volunteerId: string): void {
  const set = subscribers.get(volunteerId)
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
    subscribers.delete(volunteerId)
  }
}
