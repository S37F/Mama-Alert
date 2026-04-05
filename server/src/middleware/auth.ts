import type { NextFunction, Request, Response } from 'express'
import { asyncHandler } from '@/lib/asyncHandler'
import { supabaseAdmin } from '@/services/supabase'

export const requireAuth = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const hdr = req.headers.authorization
  const token = hdr?.startsWith('Bearer ') ? hdr.slice(7) : undefined
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !data.user) {
    res.status(401).json({ error: 'Invalid session' })
    return
  }
  const { data: hw, error: hwErr } = await supabaseAdmin
    .from('health_workers')
    .select('access_level, zone_id')
    .eq('user_id', data.user.id)
    .maybeSingle()
  if (hwErr || !hw) {
    res.status(403).json({ error: 'Health worker profile not found' })
    return
  }
  const level = hw.access_level
  if (level !== 'health_worker' && level !== 'admin') {
    res.status(403).json({ error: 'Invalid access level' })
    return
  }
  req.authUserId = data.user.id
  req.healthWorker = {
    access_level: level,
    zone_id: hw.zone_id,
  }
  next()
})

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.healthWorker?.access_level !== 'admin') {
    res.status(403).json({ error: 'Admin only' })
    return
  }
  next()
}

/** Health worker field routes — not zone admins. */
export function requireHealthWorker(req: Request, res: Response, next: NextFunction): void {
  if (req.healthWorker?.access_level !== 'health_worker') {
    res.status(403).json({ error: 'Health worker access only' })
    return
  }
  next()
}
