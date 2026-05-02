-- Pre-alert SMS destination: prefer emergency line, fall back to main clinic line (self-registered clinics).
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
    COALESCE(NULLIF(trim(h.phone_emergency), ''), NULLIF(trim(h.phone_main), '')) AS phone_emergency,
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
    AND COALESCE(NULLIF(trim(h.phone_emergency), ''), NULLIF(trim(h.phone_main), '')) IS NOT NULL
  ORDER BY distance_m ASC
  LIMIT 25;
$$;

GRANT EXECUTE ON FUNCTION public.get_nearby_hospitals(double precision, double precision, double precision) TO service_role;
