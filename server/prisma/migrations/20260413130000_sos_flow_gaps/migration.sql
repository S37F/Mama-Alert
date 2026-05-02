-- SOS flow gaps: duplicate returns alert_id, trigger_method + patient_interaction_at,
-- preferred hospital on patients, volunteer max_radius in get_nearby_volunteers,
-- get_patient_for_sos includes preferred_hospital_id.

ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "preferred_hospital_id" UUID;

ALTER TABLE "alerts" ADD COLUMN IF NOT EXISTS "trigger_method" TEXT NOT NULL DEFAULT 'pwa';
ALTER TABLE "alerts" ADD COLUMN IF NOT EXISTS "patient_interaction_at" TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'patients_preferred_hospital_id_fkey'
  ) THEN
    ALTER TABLE "patients"
      ADD CONSTRAINT "patients_preferred_hospital_id_fkey"
      FOREIGN KEY ("preferred_hospital_id") REFERENCES "hospitals"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DROP FUNCTION IF EXISTS public.insert_sos_alert_if_allowed(uuid, boolean, int);

CREATE OR REPLACE FUNCTION public.insert_sos_alert_if_allowed(
  p_patient_id uuid,
  p_incapacitation_suspected boolean,
  p_cooldown_seconds int,
  p_trigger_method text DEFAULT 'pwa'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_recent int;
  v_id uuid;
  v_dup_id uuid;
  v_method text;
BEGIN
  v_method := COALESCE(NULLIF(trim(p_trigger_method), ''), 'pwa');

  PERFORM pg_advisory_xact_lock(hashtext(p_patient_id::text));

  SELECT count(*)::int INTO v_recent
  FROM public.alerts
  WHERE patient_id = p_patient_id
    AND status IN ('active', 'volunteer_responding', 'at_facility')
    AND triggered_at >= (now() - make_interval(secs => p_cooldown_seconds));

  IF v_recent > 0 THEN
    SELECT a.id INTO v_dup_id
    FROM public.alerts a
    WHERE a.patient_id = p_patient_id
      AND a.status IN ('active', 'volunteer_responding', 'at_facility')
      AND a.triggered_at >= (now() - make_interval(secs => p_cooldown_seconds))
    ORDER BY a.triggered_at DESC
    LIMIT 1;

    RETURN jsonb_build_object('ok', false, 'reason', 'duplicate', 'alert_id', v_dup_id);
  END IF;

  INSERT INTO public.alerts (
    patient_id,
    status,
    priority,
    wave_number,
    incapacitation_suspected,
    trigger_method
  )
  VALUES (
    p_patient_id,
    'active',
    1,
    1,
    p_incapacitation_suspected,
    v_method
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('ok', true, 'alert_id', v_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.insert_sos_alert_if_allowed(uuid, boolean, int, text) TO service_role;

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
      LEAST(
        radius_meters::double precision,
        GREATEST(COALESCE(v.max_radius_km, 5), 1)::double precision * 1000.0
      )
    )
  ORDER BY distance_m ASC;
$$;

-- Return type (OUT columns) changed; Postgres requires DROP before CREATE.
DROP FUNCTION IF EXISTS public.get_patient_for_sos(text);
DROP FUNCTION IF EXISTS public.get_patient_for_sos_by_id(uuid);

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
  weeks_pregnant integer,
  preferred_hospital_id uuid
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
    p.weeks_pregnant,
    p.preferred_hospital_id
  FROM public.patients p
  WHERE p.phone_e164 = public.normalize_phone_for_match(trim(p_phone))
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_patient_for_sos_by_id(p_id uuid)
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
  weeks_pregnant integer,
  preferred_hospital_id uuid
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
    p.weeks_pregnant,
    p.preferred_hospital_id
  FROM public.patients p
  WHERE p.id = p_id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_patient_for_sos(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_patient_for_sos_by_id(uuid) TO service_role;
