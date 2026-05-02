-- Family / analytics: hospital SMS "ARRIVED" sets this alongside resolved_at.
ALTER TABLE public.alerts
  ADD COLUMN IF NOT EXISTS patient_arrived_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN public.alerts.patient_arrived_at IS 'Set when hospital confirms arrival (SMS ARRIVED or portal resolve).';

-- 10 / 25 km catchment, or NULL = whole search radius (no per-hospital cap).
ALTER TABLE public.hospitals
  ADD COLUMN IF NOT EXISTS pre_alert_radius_km INTEGER NULL;

ALTER TABLE public.hospitals DROP CONSTRAINT IF EXISTS hospitals_pre_alert_radius_km_check;
ALTER TABLE public.hospitals ADD CONSTRAINT hospitals_pre_alert_radius_km_check
  CHECK (pre_alert_radius_km IS NULL OR pre_alert_radius_km IN (10, 25));

-- Postgres does not allow changing RETURNS TABLE shape with CREATE OR REPLACE; drop first.
DROP FUNCTION IF EXISTS public.get_nearby_hospitals(double precision, double precision, double precision);

CREATE FUNCTION public.get_nearby_hospitals(
  patient_lat double precision,
  patient_lng double precision,
  radius_meters double precision
)
RETURNS TABLE (
  id uuid,
  name text,
  phone_emergency text,
  services text[],
  is_24hr boolean,
  distance_m double precision,
  pre_alert_radius_km integer
)
LANGUAGE sql
STABLE
SET search_path = public, extensions
AS $$
  SELECT
    h.id,
    h.name,
    h.phone_emergency,
    h.services,
    h.is_24hr,
    ST_Distance(
      h.location,
      ST_SetSRID(ST_MakePoint(patient_lng, patient_lat), 4326)::geography
    )::double precision AS distance_m,
    h.pre_alert_radius_km
  FROM public.hospitals h
  WHERE h.receive_alerts = true
    AND ST_DWithin(
      h.location,
      ST_SetSRID(ST_MakePoint(patient_lng, patient_lat), 4326)::geography,
      radius_meters
    )
  ORDER BY distance_m ASC
  LIMIT 25;
$$;

GRANT EXECUTE ON FUNCTION public.get_nearby_hospitals(double precision, double precision, double precision) TO service_role;
