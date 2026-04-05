-- Zone-configurable escalation (NULL = server defaults) + hospital receive_alerts on admin map RPC.
-- Run in Supabase SQL editor after schema.sql / functions.sql.

ALTER TABLE public.zones
  ADD COLUMN IF NOT EXISTS escalation_r1_m integer,
  ADD COLUMN IF NOT EXISTS escalation_r2_m integer,
  ADD COLUMN IF NOT EXISTS escalation_r3_m integer,
  ADD COLUMN IF NOT EXISTS escalation_delay_ms integer;

COMMENT ON COLUMN public.zones.escalation_r1_m IS 'First expansion radius (m), 5000–50000; NULL = default 10000';
COMMENT ON COLUMN public.zones.escalation_r2_m IS 'Second expansion radius (m), 5000–50000; NULL = default 20000';
COMMENT ON COLUMN public.zones.escalation_r3_m IS 'Reserved for future use; NULL = ignore';
COMMENT ON COLUMN public.zones.escalation_delay_ms IS 'Delay between waves (ms), min 30000; NULL = env ESCALATION_DELAY_MS / 5m';

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
