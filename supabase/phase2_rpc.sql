-- Phase 2 backend helpers (run after functions.sql)
-- SOS + lookups use SECURITY DEFINER so service_role RPC can read coordinates reliably.

CREATE OR REPLACE FUNCTION public.get_patient_for_sos(p_phone text)
RETURNS TABLE (
  id uuid,
  name text,
  phone_primary text,
  language text,
  landmark text,
  blood_type text,
  lat double precision,
  lng double precision,
  zone_id uuid,
  health_worker_id uuid,
  emergency_contacts jsonb,
  status_token uuid,
  risk_flags text[],
  weeks_pregnant integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT
    p.id,
    p.name,
    p.phone_primary,
    p.language,
    p.landmark,
    p.blood_type,
    ST_Y(p.location::geometry)::double precision AS lat,
    ST_X(p.location::geometry)::double precision AS lng,
    p.zone_id,
    p.health_worker_id,
    p.emergency_contacts,
    p.status_token,
    p.risk_flags,
    p.weeks_pregnant
  FROM public.patients p
  WHERE p.phone_primary = trim(p_phone)
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_patient_for_sos(text) TO service_role;

ALTER TABLE public.alerts
  ADD COLUMN IF NOT EXISTS incapacitation_suspected boolean NOT NULL DEFAULT false;
