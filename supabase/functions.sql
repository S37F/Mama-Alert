-- MamaAlert Phase 1 — RPC functions (run after schema.sql)
-- PostGIS geography + meters (ST_Distance / ST_DWithin on geography use meters)
-- search_path includes `extensions` because postgis is installed WITH SCHEMA extensions (see schema.sql).

CREATE OR REPLACE FUNCTION public.get_nearby_volunteers(
  patient_lat double precision,
  patient_lng double precision,
  radius_meters double precision
)
RETURNS TABLE (
  id uuid,
  name text,
  phone text,
  skills text[],
  vehicle text,
  distance_m double precision,
  language text
)
LANGUAGE sql
STABLE
SET search_path = public, extensions
AS $$
  SELECT
    v.id,
    v.name,
    v.phone,
    v.skills,
    v.vehicle,
    ST_Distance(
      v.location,
      ST_SetSRID(ST_MakePoint(patient_lng, patient_lat), 4326)::geography
    )::double precision AS distance_m,
    v.language
  FROM public.volunteers v
  WHERE v.is_active = true
    AND ST_DWithin(
      v.location,
      ST_SetSRID(ST_MakePoint(patient_lng, patient_lat), 4326)::geography,
      radius_meters
    )
  ORDER BY distance_m ASC;
$$;

CREATE OR REPLACE FUNCTION public.get_nearby_hospitals(
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
  distance_m double precision
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
    )::double precision AS distance_m
  FROM public.hospitals h
  WHERE h.receive_alerts = true
    AND ST_DWithin(
      h.location,
      ST_SetSRID(ST_MakePoint(patient_lng, patient_lat), 4326)::geography,
      radius_meters
    )
  ORDER BY distance_m ASC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_nearby_volunteers(double precision, double precision, double precision) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_nearby_hospitals(double precision, double precision, double precision) TO service_role;

CREATE OR REPLACE FUNCTION public.distance_volunteer_to_patient(
  p_volunteer_id uuid,
  p_patient_id uuid
)
RETURNS double precision
LANGUAGE sql
STABLE
SET search_path = public, extensions
AS $$
  SELECT ST_Distance(v.location, p.location)::double precision
  FROM public.volunteers v
  CROSS JOIN public.patients p
  WHERE v.id = p_volunteer_id AND p.id = p_patient_id;
$$;

GRANT EXECUTE ON FUNCTION public.distance_volunteer_to_patient(uuid, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_patients_in_zone(p_zone_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  lat double precision,
  lng double precision
)
LANGUAGE sql
STABLE
SET search_path = public, extensions
AS $$
  SELECT
    p.id,
    p.name,
    ST_Y(p.location::geometry)::double precision AS lat,
    ST_X(p.location::geometry)::double precision AS lng
  FROM public.patients p
  WHERE p.zone_id = p_zone_id;
$$;

CREATE OR REPLACE FUNCTION public.admin_volunteers_in_zone(p_zone_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  lat double precision,
  lng double precision
)
LANGUAGE sql
STABLE
SET search_path = public, extensions
AS $$
  SELECT
    v.id,
    v.name,
    ST_Y(v.location::geometry)::double precision AS lat,
    ST_X(v.location::geometry)::double precision AS lng
  FROM public.volunteers v
  WHERE v.zone_id = p_zone_id;
$$;

CREATE OR REPLACE FUNCTION public.admin_hospitals_in_zone(p_zone_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  lat double precision,
  lng double precision,
  receive_alerts boolean
)
LANGUAGE sql
STABLE
SET search_path = public, extensions
AS $$
  SELECT
    h.id,
    h.name,
    ST_Y(h.location::geometry)::double precision AS lat,
    ST_X(h.location::geometry)::double precision AS lng,
    h.receive_alerts
  FROM public.hospitals h
  WHERE h.zone_id = p_zone_id;
$$;

CREATE OR REPLACE FUNCTION public.admin_active_alert_points(p_zone_id uuid)
RETURNS TABLE (
  alert_id uuid,
  lat double precision,
  lng double precision
)
LANGUAGE sql
STABLE
SET search_path = public, extensions
AS $$
  SELECT
    a.id AS alert_id,
    ST_Y(p.location::geometry)::double precision AS lat,
    ST_X(p.location::geometry)::double precision AS lng
  FROM public.alerts a
  INNER JOIN public.patients p ON p.id = a.patient_id
  WHERE p.zone_id = p_zone_id
    AND a.status IN ('active', 'volunteer_responding', 'at_facility');
$$;

GRANT EXECUTE ON FUNCTION public.admin_patients_in_zone(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_volunteers_in_zone(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_hospitals_in_zone(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_active_alert_points(uuid) TO service_role;
