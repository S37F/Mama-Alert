import { Router } from 'express'
import { z } from 'zod'
import { asyncHandler } from '@/lib/asyncHandler'
import { logError } from '@/lib/logger'
import { assertAdminHasZone, requireAuth } from '@/middleware/auth'
import { supabaseAdmin } from '@/services/supabase'
import { supabaseAnon } from '@/services/supabaseAnon'

export const authRouter = Router()

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() })
      return
    }
    const { email, password } = parsed.data
    const { data, error } = await supabaseAnon.auth.signInWithPassword({ email, password })
    if (error || !data.session) {
      res.status(401).json({ error: error?.message ?? 'Login failed' })
      return
    }
    const { data: hw, error: hwErr } = await supabaseAdmin
      .from('health_workers')
      .select('access_level, zone_id')
      .eq('user_id', data.user.id)
      .maybeSingle()
    if (hwErr || !hw) {
      res.status(403).json({ error: 'Health worker profile not linked to this account' })
      return
    }
    if (!assertAdminHasZone(res, hw.access_level, hw.zone_id)) {
      return
    }
    res.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
      expires_in: data.session.expires_in,
      token_type: data.session.token_type,
      user: { id: data.user.id, email: data.user.email },
      role: hw.access_level,
      zone_id: hw.zone_id,
    })
  }),
)

authRouter.post(
  '/logout',
  requireAuth,
  asyncHandler(async (req, res) => {
    const hdr = req.headers.authorization
    const token = hdr?.startsWith('Bearer ') ? hdr.slice(7) : undefined
    if (!token) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }
    const { error: signOutErr } = await supabaseAdmin.auth.admin.signOut(token, 'global')
    if (signOutErr) {
      logError('auth: admin signOut failed', { error: String(signOutErr) })
    }
    res.status(204).end()
  }),
)
