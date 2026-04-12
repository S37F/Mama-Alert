/**
 * Supabase GoTrue only — JWT validation, password login (anon client elsewhere),
 * admin invite, admin sign-out. Database access uses Prisma (`@/lib/prisma`).
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL as string
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string

export const supabaseAuthAdmin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})
