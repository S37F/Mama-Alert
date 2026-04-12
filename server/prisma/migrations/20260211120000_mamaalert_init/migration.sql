-- Prisma migration 20260211120000_mamaalert_init: full DDL + RPCs + grants.
-- Source: supabase/schema.sql + functions.sql + grant_public_privileges.sql.
-- Requires: PostGIS; health_workers references auth.users (Supabase).

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

-- Phone match key (mirrors server/src/lib/phone.ts normalizePhone)
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
-- Enums (as check constraints / text for simplicity with PostgREST)
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- zones
-- ---------------------------------------------------------------------------
CREATE TABLE public.zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  admin_org TEXT,
  escalation_r1_m INTEGER CHECK (escalation_r1_m IS NULL OR (escalation_r1_m >= 5000 AND escalation_r1_m <= 50000)),
  escalation_r2_m INTEGER CHECK (escalation_r2_m IS NULL OR (escalation_r2_m >= 5000 AND escalation_r2_m <= 50000)),
  escalation_r3_m INTEGER CHECK (escalation_r3_m IS NULL OR (escalation_r3_m >= 5000 AND escalation_r3_m <= 50000)),
  escalation_delay_ms INTEGER CHECK (escalation_delay_ms IS NULL OR escalation_delay_ms >= 30000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- health_workers Ã¢â‚¬â€ linked to Supabase Auth
-- ---------------------------------------------------------------------------
CREATE TABLE public.health_workers (
  user_id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  zone_id UUID REFERENCES public.zones (id) ON DELETE SET NULL,
  access_level TEXT NOT NULL DEFAULT 'health_worker'
    CHECK (access_level IN ('health_worker', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX health_workers_zone_id_idx ON public.health_workers (zone_id);

-- ---------------------------------------------------------------------------
-- patients
-- ---------------------------------------------------------------------------
CREATE TABLE public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  health_worker_id UUID NOT NULL REFERENCES public.health_workers (user_id) ON DELETE RESTRICT,
  zone_id UUID REFERENCES public.zones (id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  age INTEGER,
  phone_primary TEXT NOT NULL,
  phone_e164 TEXT GENERATED ALWAYS AS (public.normalize_phone_for_match(phone_primary)) STORED NOT NULL,
  phone_secondary TEXT,
  village TEXT,
  landmark TEXT,
  location GEOGRAPHY (POINT, 4326) NOT NULL,
  weeks_pregnant INTEGER CHECK (weeks_pregnant IS NULL OR (weeks_pregnant >= 1 AND weeks_pregnant <= 44)),
  due_date DATE,
  prev_pregnancies INTEGER,
  prev_births INTEGER,
  prev_csection BOOLEAN NOT NULL DEFAULT false,
  last_anc_date DATE,
  blood_type TEXT,
  language TEXT NOT NULL DEFAULT 'en',
  status_token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  risk_flags TEXT[] NOT NULL DEFAULT '{}',
  medication_name TEXT,
  emergency_contacts JSONB NOT NULL DEFAULT '[]'::jsonb,
  patient_status TEXT NOT NULL DEFAULT 'active'
    CHECK (patient_status IN ('active', 'delivered', 'transferred', 'lost_followup')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT patients_phone_primary_unique UNIQUE (phone_primary)
);

CREATE INDEX patients_health_worker_id_idx ON public.patients (health_worker_id);
CREATE INDEX patients_zone_id_idx ON public.patients (zone_id);
CREATE INDEX patients_status_token_idx ON public.patients (status_token);
CREATE INDEX patients_location_gix ON public.patients USING GIST (location);
CREATE UNIQUE INDEX patients_phone_e164_uidx ON public.patients (phone_e164);

-- ---------------------------------------------------------------------------
-- volunteers
-- ---------------------------------------------------------------------------
CREATE TABLE public.volunteers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID REFERENCES public.zones (id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  phone_e164 TEXT GENERATED ALWAYS AS (public.normalize_phone_for_match(phone)) STORED NOT NULL,
  location GEOGRAPHY (POINT, 4326) NOT NULL,
  skills TEXT[] NOT NULL DEFAULT '{}',
  vehicle TEXT NOT NULL DEFAULT 'none'
    CHECK (vehicle IN ('none', 'motorcycle', 'car', 'ambulance')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  max_radius_km INTEGER NOT NULL DEFAULT 5 CHECK (max_radius_km > 0),
  language TEXT NOT NULL DEFAULT 'en',
  last_response_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT volunteers_phone_unique UNIQUE (phone)
);

CREATE UNIQUE INDEX volunteers_phone_e164_uidx ON public.volunteers (phone_e164);

CREATE INDEX volunteers_zone_id_idx ON public.volunteers (zone_id);
CREATE INDEX volunteers_location_gix ON public.volunteers USING GIST (location);
CREATE INDEX volunteers_active_idx ON public.volunteers (is_active) WHERE is_active = true;

-- ---------------------------------------------------------------------------
-- hospitals
-- ---------------------------------------------------------------------------
CREATE TABLE public.hospitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID REFERENCES public.zones (id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'PHC',
  location GEOGRAPHY (POINT, 4326) NOT NULL,
  phone_main TEXT,
  phone_emergency TEXT,
  services TEXT[] NOT NULL DEFAULT '{}',
  is_24hr BOOLEAN NOT NULL DEFAULT false,
  receive_alerts BOOLEAN NOT NULL DEFAULT true,
  portal_api_key_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX hospitals_zone_id_idx ON public.hospitals (zone_id);
CREATE INDEX hospitals_location_gix ON public.hospitals USING GIST (location);
CREATE INDEX hospitals_receive_alerts_idx ON public.hospitals (receive_alerts) WHERE receive_alerts = true;

-- ---------------------------------------------------------------------------
-- alerts
-- ---------------------------------------------------------------------------
CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients (id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'volunteer_responding', 'at_facility', 'resolved', 'cancelled')),
  priority INTEGER NOT NULL DEFAULT 1 CHECK (priority IN (1, 2, 3)),
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  responding_volunteer_id UUID REFERENCES public.volunteers (id) ON DELETE SET NULL,
  volunteer_confirmed_at TIMESTAMPTZ,
  nearest_hospital_id UUID REFERENCES public.hospitals (id) ON DELETE SET NULL,
  wave_number INTEGER NOT NULL DEFAULT 1 CHECK (wave_number >= 1),
  incapacitation_suspected BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX alerts_patient_id_idx ON public.alerts (patient_id);
CREATE INDEX alerts_status_idx ON public.alerts (status);
CREATE INDEX alerts_triggered_at_idx ON public.alerts (triggered_at DESC);

-- ---------------------------------------------------------------------------
-- alert_responses
-- ---------------------------------------------------------------------------
CREATE TABLE public.alert_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID NOT NULL REFERENCES public.alerts (id) ON DELETE CASCADE,
  volunteer_id UUID NOT NULL REFERENCES public.volunteers (id) ON DELETE CASCADE,
  response TEXT CHECK (response IS NULL OR response IN ('YES', 'NO')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  wave_number INTEGER NOT NULL DEFAULT 1 CHECK (wave_number >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT alert_responses_alert_volunteer_wave_unique UNIQUE (alert_id, volunteer_id, wave_number)
);

CREATE INDEX alert_responses_alert_id_idx ON public.alert_responses (alert_id);
CREATE INDEX alert_responses_volunteer_id_idx ON public.alert_responses (volunteer_id);

-- ---------------------------------------------------------------------------
-- Hospital acks + volunteer OTP (portal auth); RLS on Ã¢â‚¬â€ no policies = PostgREST denies nonÃ¢â‚¬â€œservice-role
-- ---------------------------------------------------------------------------
CREATE TABLE public.hospital_alert_acks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID NOT NULL REFERENCES public.alerts (id) ON DELETE CASCADE,
  hospital_id UUID NOT NULL REFERENCES public.hospitals (id) ON DELETE CASCADE,
  ack_type TEXT NOT NULL CHECK (ack_type IN ('ready', 'more_info')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX hospital_alert_acks_alert_id_idx ON public.hospital_alert_acks (alert_id);

CREATE TABLE public.volunteer_otp_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  volunteer_id UUID NOT NULL REFERENCES public.volunteers (id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX volunteer_otp_volunteer_created_idx ON public.volunteer_otp_challenges (volunteer_id, created_at DESC);

CREATE TABLE public.delayed_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dedupe_key TEXT NOT NULL UNIQUE,
  job_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  run_after TIMESTAMPTZ NOT NULL,
  locked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX delayed_jobs_due_idx ON public.delayed_jobs (run_after) WHERE locked_at IS NULL;

ALTER TABLE public.hospital_alert_acks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_otp_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delayed_jobs ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER patients_set_updated_at
  BEFORE UPDATE ON public.patients
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER alerts_set_updated_at
  BEFORE UPDATE ON public.alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER health_workers_set_updated_at
  BEFORE UPDATE ON public.health_workers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER volunteers_set_updated_at
  BEFORE UPDATE ON public.volunteers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER hospitals_set_updated_at
  BEFORE UPDATE ON public.hospitals
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

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

CREATE TRIGGER health_workers_no_role_escalation
  BEFORE UPDATE ON public.health_workers
  FOR EACH ROW
  EXECUTE FUNCTION public.health_workers_prevent_role_self_escalation();

-- ---------------------------------------------------------------------------
-- Row Level Security: zones, health_workers, volunteers, hospitals
-- ---------------------------------------------------------------------------
ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY zones_select_authenticated
  ON public.zones
  FOR SELECT
  TO authenticated
  USING (true);

ALTER TABLE public.health_workers ENABLE ROW LEVEL SECURITY;

CREATE POLICY health_workers_select_self
  ON public.health_workers
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY health_workers_select_admin_same_zone
  ON public.health_workers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.health_workers me
      WHERE me.user_id = auth.uid()
        AND me.access_level = 'admin'
        AND me.zone_id IS NOT NULL
        AND me.zone_id = health_workers.zone_id
    )
  );

CREATE POLICY health_workers_insert_self
  ON public.health_workers
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY health_workers_update_self
  ON public.health_workers
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

ALTER TABLE public.volunteers ENABLE ROW LEVEL SECURITY;

CREATE POLICY volunteers_select_health_team
  ON public.volunteers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.health_workers hw
      WHERE hw.user_id = auth.uid()
        AND hw.zone_id IS NOT NULL
        AND volunteers.zone_id = hw.zone_id
    )
  );

CREATE POLICY volunteers_update_zone_admin
  ON public.volunteers
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.health_workers hw
      WHERE hw.user_id = auth.uid()
        AND hw.access_level = 'admin'
        AND hw.zone_id IS NOT NULL
        AND hw.zone_id = volunteers.zone_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.health_workers hw
      WHERE hw.user_id = auth.uid()
        AND hw.access_level = 'admin'
        AND hw.zone_id IS NOT NULL
        AND hw.zone_id = volunteers.zone_id
    )
  );

ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;

CREATE POLICY hospitals_select_health_team
  ON public.hospitals
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.health_workers hw
      WHERE hw.user_id = auth.uid()
        AND hw.zone_id IS NOT NULL
        AND hospitals.zone_id = hw.zone_id
    )
  );

-- ---------------------------------------------------------------------------
-- Row Level Security: patients, alerts, alert_responses
-- ---------------------------------------------------------------------------
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_responses ENABLE ROW LEVEL SECURITY;

-- Patients: assigned health worker sees own patients
CREATE POLICY health_workers_see_own_patients
  ON public.patients
  FOR SELECT
  TO authenticated
  USING (health_worker_id = auth.uid());

CREATE POLICY health_workers_insert_own_patients
  ON public.patients
  FOR INSERT
  TO authenticated
  WITH CHECK (health_worker_id = auth.uid());

CREATE POLICY health_workers_update_own_patients
  ON public.patients
  FOR UPDATE
  TO authenticated
  USING (health_worker_id = auth.uid())
  WITH CHECK (health_worker_id = auth.uid());

CREATE POLICY health_workers_delete_own_patients
  ON public.patients
  FOR DELETE
  TO authenticated
  USING (health_worker_id = auth.uid());

-- Patients: zone admins see all patients in their zone
CREATE POLICY admin_zone_access_select
  ON public.patients
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.health_workers hw
      WHERE hw.user_id = auth.uid()
        AND hw.access_level = 'admin'
        AND hw.zone_id IS NOT NULL
        AND hw.zone_id = patients.zone_id
    )
  );

CREATE POLICY admin_zone_access_update
  ON public.patients
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.health_workers hw
      WHERE hw.user_id = auth.uid()
        AND hw.access_level = 'admin'
        AND hw.zone_id IS NOT NULL
        AND hw.zone_id = patients.zone_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.health_workers hw
      WHERE hw.user_id = auth.uid()
        AND hw.access_level = 'admin'
        AND hw.zone_id IS NOT NULL
        AND hw.zone_id = patients.zone_id
    )
  );

-- Alerts + responses: health worker who owns the patient, or zone admin
CREATE POLICY alert_access_select_alerts
  ON public.alerts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.patients p
      JOIN public.health_workers hw ON hw.user_id = auth.uid()
      WHERE p.id = alerts.patient_id
        AND (
          p.health_worker_id = auth.uid()
          OR (
            hw.access_level = 'admin'
            AND hw.zone_id IS NOT NULL
            AND hw.zone_id = p.zone_id
          )
        )
    )
  );

-- Optional: health workers may insert/update alerts for their patients via client (usually service role only)
CREATE POLICY alert_access_insert_alerts
  ON public.alerts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.patients p
      WHERE p.id = patient_id
        AND p.health_worker_id = auth.uid()
    )
  );

CREATE POLICY alert_access_update_alerts
  ON public.alerts
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.patients p
      JOIN public.health_workers hw ON hw.user_id = auth.uid()
      WHERE p.id = alerts.patient_id
        AND (
          p.health_worker_id = auth.uid()
          OR (
            hw.access_level = 'admin'
            AND hw.zone_id IS NOT NULL
            AND hw.zone_id = p.zone_id
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.patients p
      JOIN public.health_workers hw ON hw.user_id = auth.uid()
      WHERE p.id = patient_id
        AND (
          p.health_worker_id = auth.uid()
          OR (
            hw.access_level = 'admin'
            AND hw.zone_id IS NOT NULL
            AND hw.zone_id = p.zone_id
          )
        )
    )
  );

CREATE POLICY alert_responses_select
  ON public.alert_responses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.alerts a
      JOIN public.patients p ON p.id = a.patient_id
      JOIN public.health_workers hw ON hw.user_id = auth.uid()
      WHERE a.id = alert_responses.alert_id
        AND (
          p.health_worker_id = auth.uid()
          OR (
            hw.access_level = 'admin'
            AND hw.zone_id IS NOT NULL
            AND hw.zone_id = p.zone_id
          )
        )
    )
  );

CREATE POLICY alert_responses_insert
  ON public.alert_responses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.alerts a
      JOIN public.patients p ON p.id = a.patient_id
      WHERE a.id = alert_id
        AND p.health_worker_id = auth.uid()
    )
  );

CREATE POLICY alert_responses_update
  ON public.alert_responses
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.alerts a
      JOIN public.patients p ON p.id = a.patient_id
      JOIN public.health_workers hw ON hw.user_id = auth.uid()
      WHERE a.id = alert_responses.alert_id
        AND (
          p.health_worker_id = auth.uid()
          OR (
            hw.access_level = 'admin'
            AND hw.zone_id IS NOT NULL
            AND hw.zone_id = p.zone_id
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.alerts a
      JOIN public.patients p ON p.id = a.patient_id
      JOIN public.health_workers hw ON hw.user_id = auth.uid()
      WHERE a.id = alert_id
        AND (
          p.health_worker_id = auth.uid()
          OR (
            hw.access_level = 'admin'
            AND hw.zone_id IS NOT NULL
            AND hw.zone_id = p.zone_id
          )
        )
    )
  );

-- Service role (backend) bypasses RLS by default in Supabase.

-- ---------------------------------------------------------------------------
-- Realtime: alerts visible to authenticated subscribers with SELECT policy
-- (enable replication if needed Ã¢â‚¬â€ Supabase usually adds tables to supabase_realtime publication)
-- ---------------------------------------------------------------------------
-- Supabase only: add alerts to Realtime publication (skip if publication missing)
DO $mamaalert_pub$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts';
    EXCEPTION
      WHEN duplicate_object THEN NULL;
      WHEN OTHERS THEN NULL;
    END;
  END IF;
END
$mamaalert_pub$;


-- MamaAlert Ã¢â‚¬â€ RPC functions (run after schema.sql, before seed.sql).
-- Includes get_patient_for_sos (SECURITY DEFINER) for the SOS pipeline.
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
  -- Coordinate order: longitude first, latitude second (same as ST_Point(lon, lat); this file uses ST_MakePoint).
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

-- SOS patient lookup: SECURITY DEFINER so service_role reads coordinates reliably.
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
  WHERE p.phone_e164 = public.normalize_phone_for_match(trim(p_phone))
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_patient_for_sos(text) TO service_role;

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
  WHERE p.id = p_id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_patient_for_sos_by_id(uuid) TO service_role;

-- Atomic volunteer YES (race-safe); optional nearest hospital id
CREATE OR REPLACE FUNCTION public.claim_alert_for_volunteer(
  p_alert_id uuid,
  p_volunteer_id uuid,
  p_response_id uuid,
  p_nearest_hospital_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_status text;
  v_rows int;
BEGIN
  SELECT a.status INTO v_status FROM public.alerts a WHERE a.id = p_alert_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'alert_not_found');
  END IF;
  IF v_status IS DISTINCT FROM 'active' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'alert_not_active', 'status', v_status);
  END IF;

  PERFORM 1
  FROM public.alert_responses ar
  WHERE ar.id = p_response_id
    AND ar.alert_id = p_alert_id
    AND ar.volunteer_id = p_volunteer_id
    AND ar.response IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'response_invalid');
  END IF;

  UPDATE public.alerts
  SET
    status = 'volunteer_responding',
    responding_volunteer_id = p_volunteer_id,
    volunteer_confirmed_at = now(),
    nearest_hospital_id = COALESCE(p_nearest_hospital_id, nearest_hospital_id),
    updated_at = now()
  WHERE id = p_alert_id AND status = 'active';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'lost_race');
  END IF;

  UPDATE public.alert_responses
  SET response = 'YES', responded_at = now()
  WHERE id = p_response_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_alert_for_volunteer(uuid, uuid, uuid, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.insert_sos_alert_if_allowed(
  p_patient_id uuid,
  p_incapacitation_suspected boolean,
  p_cooldown_seconds int DEFAULT 600
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_recent int;
  v_id uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_patient_id::text));

  SELECT count(*)::int INTO v_recent
  FROM public.alerts
  WHERE patient_id = p_patient_id
    AND status IN ('active', 'volunteer_responding', 'at_facility')
    AND triggered_at >= (now() - make_interval(secs => p_cooldown_seconds));

  IF v_recent > 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'duplicate');
  END IF;

  INSERT INTO public.alerts (
    patient_id,
    status,
    priority,
    wave_number,
    incapacitation_suspected
  )
  VALUES (
    p_patient_id,
    'active',
    1,
    1,
    p_incapacitation_suspected
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('ok', true, 'alert_id', v_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.insert_sos_alert_if_allowed(uuid, boolean, int) TO service_role;

GRANT EXECUTE ON FUNCTION public.admin_patients_in_zone(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_volunteers_in_zone(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_hospitals_in_zone(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_active_alert_points(uuid) TO service_role;


-- =============================================================================
-- Re-apply Supabase-friendly privileges on everything in `public`
-- =============================================================================
-- Run after schema.sql and functions.sql (and after any migration that creates
-- new objects). Safe to run multiple times.
--
-- The SQL Editor often uses a new session per run, so default privileges from
-- reset_public_schema.sql may not attach to objects created in a later script.
-- This file fixes that for PostgREST + RLS clients.
-- =============================================================================

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON SCHEMA public TO postgres, anon, authenticated, service_role;

GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON ROUTINES TO postgres, anon, authenticated, service_role;
