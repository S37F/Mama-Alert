-- MamaAlert Phase 1 — schema (run in Supabase SQL editor before functions.sql and seed.sql)
-- Requires: PostGIS

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

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
-- health_workers — linked to Supabase Auth
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

-- ---------------------------------------------------------------------------
-- volunteers
-- ---------------------------------------------------------------------------
CREATE TABLE public.volunteers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID REFERENCES public.zones (id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
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
-- (enable replication if needed — Supabase usually adds tables to supabase_realtime publication)
-- ---------------------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
