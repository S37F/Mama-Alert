-- MamaAlert security remediation — run in Supabase SQL editor AFTER baseline schema.sql + functions.sql.
-- Idempotent where possible. For greenfield installs, prefer updated schema.sql + functions.sql instead.

-- ---------------------------------------------------------------------------
-- 1. Phone normalization (mirrors server/src/lib/phone.ts)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.normalize_phone_for_match(p text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE
    WHEN p IS NULL OR btrim(p) = '' THEN ''
    WHEN btrim(p) LIKE '+%' THEN '+' || regexp_replace(substring(btrim(p) from 2), '\D', '', 'g')
    ELSE regexp_replace(btrim(p), '\s', '', 'g')
  END;
$$;

-- ---------------------------------------------------------------------------
-- 2. patients.phone_e164
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'patients' AND column_name = 'phone_e164'
  ) THEN
    ALTER TABLE public.patients ADD COLUMN phone_e164 text;
    UPDATE public.patients
    SET phone_e164 = public.normalize_phone_for_match(phone_primary)
    WHERE phone_e164 IS NULL;
    ALTER TABLE public.patients ALTER COLUMN phone_e164 SET NOT NULL;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.patients_set_phone_e164()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.phone_e164 := public.normalize_phone_for_match(NEW.phone_primary);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS patients_phone_e164_biub ON public.patients;
CREATE TRIGGER patients_phone_e164_biub
  BEFORE INSERT OR UPDATE OF phone_primary ON public.patients
  FOR EACH ROW
  EXECUTE FUNCTION public.patients_set_phone_e164();

CREATE UNIQUE INDEX IF NOT EXISTS patients_phone_e164_uidx ON public.patients (phone_e164);

-- ---------------------------------------------------------------------------
-- 3. volunteers.phone_e164
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'volunteers' AND column_name = 'phone_e164'
  ) THEN
    ALTER TABLE public.volunteers ADD COLUMN phone_e164 text;
    UPDATE public.volunteers
    SET phone_e164 = public.normalize_phone_for_match(phone)
    WHERE phone_e164 IS NULL;
    ALTER TABLE public.volunteers ALTER COLUMN phone_e164 SET NOT NULL;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.volunteers_set_phone_e164()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.phone_e164 := public.normalize_phone_for_match(NEW.phone);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS volunteers_phone_e164_biub ON public.volunteers;
CREATE TRIGGER volunteers_phone_e164_biub
  BEFORE INSERT OR UPDATE OF phone ON public.volunteers
  FOR EACH ROW
  EXECUTE FUNCTION public.volunteers_set_phone_e164();

DROP INDEX IF EXISTS volunteers_phone_e164_uidx;
CREATE UNIQUE INDEX volunteers_phone_e164_uidx ON public.volunteers (phone_e164);

-- ---------------------------------------------------------------------------
-- 4. health_workers: block authenticated self-change of access_level / zone_id
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.health_workers_prevent_role_self_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF (NEW.access_level IS DISTINCT FROM OLD.access_level OR NEW.zone_id IS DISTINCT FROM OLD.zone_id) THEN
      IF COALESCE(auth.role(), '') = 'authenticated' THEN
        RAISE EXCEPTION 'Changing access_level or zone_id is not allowed for authenticated clients';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS health_workers_no_role_escalation ON public.health_workers;
CREATE TRIGGER health_workers_no_role_escalation
  BEFORE UPDATE ON public.health_workers
  FOR EACH ROW
  EXECUTE FUNCTION public.health_workers_prevent_role_self_escalation();

-- After this file, re-run supabase/functions.sql (get_patient_for_sos, claim_alert_for_volunteer, insert_sos_alert_if_allowed).

-- ---------------------------------------------------------------------------
-- 5. Hospital portal API key (hash) + acks table
-- ---------------------------------------------------------------------------
ALTER TABLE public.hospitals
  ADD COLUMN IF NOT EXISTS portal_api_key_hash text;

CREATE TABLE IF NOT EXISTS public.hospital_alert_acks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id uuid NOT NULL REFERENCES public.alerts (id) ON DELETE CASCADE,
  hospital_id uuid NOT NULL REFERENCES public.hospitals (id) ON DELETE CASCADE,
  ack_type text NOT NULL CHECK (ack_type IN ('ready', 'more_info')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hospital_alert_acks_alert_id_idx ON public.hospital_alert_acks (alert_id);

-- ---------------------------------------------------------------------------
-- 6. Volunteer OTP challenges (HTTP portal login)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.volunteer_otp_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  volunteer_id uuid NOT NULL REFERENCES public.volunteers (id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS volunteer_otp_volunteer_created_idx
  ON public.volunteer_otp_challenges (volunteer_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 7. Delayed jobs (escalation + incapacitation)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.delayed_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dedupe_key text NOT NULL UNIQUE,
  job_type text NOT NULL,
  payload jsonb NOT NULL,
  run_after timestamptz NOT NULL,
  locked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS delayed_jobs_due_idx ON public.delayed_jobs (run_after) WHERE locked_at IS NULL;

ALTER TABLE public.delayed_jobs ENABLE ROW LEVEL SECURITY;

-- Re-run supabase/functions.sql for get_patient_for_sos_by_id, claim_alert_for_volunteer, insert_sos_alert_if_allowed.
