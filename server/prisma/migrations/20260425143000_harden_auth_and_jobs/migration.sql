CREATE TABLE IF NOT EXISTS public.auth_otp_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_e164 TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('patient', 'volunteer', 'health_worker', 'admin')),
  profile_id UUID NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auth_otp_challenges_phone_created_idx
  ON public.auth_otp_challenges (phone_e164, created_at DESC);

ALTER TABLE public.auth_otp_challenges ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.delayed_jobs
  ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error TEXT;
