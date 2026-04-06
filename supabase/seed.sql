-- MamaAlert Phase 1 — seed data (run after schema.sql and functions.sql)
--
-- Health worker + demo patient need a real Supabase Auth user (FK to auth.users):
-- 1. Dashboard → Authentication → Users → Add user (e.g. demo-worker@example.com + password).
-- 2. Open that user → copy UUID.
-- 3. Set demo_hw below to that UUID (as a quoted uuid literal) and run this file again.
--
-- If demo_hw is NULL, zone / hospital / volunteers still seed; worker + patient are skipped (see NOTICE).

-- ---------------------------------------------------------------------------
-- Demo zone
-- ---------------------------------------------------------------------------
INSERT INTO public.zones (id, name, admin_org)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Demo Zone',
  'GNEC Demo NGO'
)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Demo hospital (idempotent by zone + name)
-- ---------------------------------------------------------------------------
INSERT INTO public.hospitals (
  name,
  type,
  location,
  phone_main,
  phone_emergency,
  services,
  is_24hr,
  receive_alerts,
  zone_id
)
SELECT
  'PHC Demo Clinic',
  'PHC',
  ST_SetSRID(ST_MakePoint(73.8567, 18.5204), 4326)::geography,
  '+1234567890',
  '+1234567891',
  ARRAY['normal_delivery', 'blood_bank']::text[],
  true,
  true,
  '00000000-0000-0000-0000-000000000001'::uuid
WHERE NOT EXISTS (
  SELECT 1
  FROM public.hospitals h
  WHERE h.zone_id = '00000000-0000-0000-0000-000000000001'::uuid
    AND h.name = 'PHC Demo Clinic'
);

-- ---------------------------------------------------------------------------
-- Demo volunteers — replace phones with numbers you control for SMS tests
-- ---------------------------------------------------------------------------
INSERT INTO public.volunteers (
  name,
  phone,
  location,
  skills,
  vehicle,
  is_active,
  max_radius_km,
  language,
  zone_id
)
VALUES
  (
    'Ravi Kumar',
    '+15551230101',
    ST_SetSRID(ST_MakePoint(73.8590, 18.5251), 4326)::geography,
    ARRAY['first_aid']::text[],
    'motorcycle',
    true,
    5,
    'en',
    '00000000-0000-0000-0000-000000000001'::uuid
  ),
  (
    'Sister Agnes',
    '+15551230102',
    ST_SetSRID(ST_MakePoint(73.8601, 18.5180), 4326)::geography,
    ARRAY['nurse']::text[],
    'none',
    true,
    5,
    'en',
    '00000000-0000-0000-0000-000000000001'::uuid
  ),
  (
    'Kofi Adu',
    '+15551230103',
    ST_SetSRID(ST_MakePoint(73.8620, 18.5230), 4326)::geography,
    ARRAY['community_health_worker']::text[],
    'car',
    true,
    10,
    'en',
    '00000000-0000-0000-0000-000000000001'::uuid
  )
ON CONFLICT (phone) DO UPDATE
SET
  name = EXCLUDED.name,
  location = EXCLUDED.location,
  skills = EXCLUDED.skills,
  vehicle = EXCLUDED.vehicle,
  is_active = EXCLUDED.is_active,
  max_radius_km = EXCLUDED.max_radius_km,
  language = EXCLUDED.language,
  zone_id = EXCLUDED.zone_id;

-- ---------------------------------------------------------------------------
-- Demo health worker + patient (requires real auth.users id)
-- ---------------------------------------------------------------------------
DO $seed$
DECLARE
  demo_zone CONSTANT uuid := '00000000-0000-0000-0000-000000000001';
  -- Paste your Auth user UUID here, e.g. 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid
  -- Leave NULL on first run; create the user, set this, then run the whole seed file again.
  -- Hint: SELECT id, email FROM auth.users;
  demo_hw uuid := NULL;
BEGIN
  IF demo_hw IS NULL THEN
    RAISE NOTICE
      'seed.sql: demo_hw is NULL — skipped health_workers + patients. Create a user in Authentication, set demo_hw to their UUID in seed.sql, re-run.';
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = demo_hw) THEN
    RAISE EXCEPTION
      'seed.sql: No auth.users row for %. Create a user in Authentication and set demo_hw in this file to that UUID.',
      demo_hw;
  END IF;

  INSERT INTO public.health_workers (user_id, name, phone, zone_id, access_level)
  VALUES (
    demo_hw,
    'Demo Health Worker',
    '+15551230099',
    demo_zone,
    'health_worker'
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    zone_id = EXCLUDED.zone_id,
    access_level = EXCLUDED.access_level;

  INSERT INTO public.patients (
    health_worker_id,
    zone_id,
    name,
    age,
    phone_primary,
    location,
    village,
    landmark,
    weeks_pregnant,
    due_date,
    blood_type,
    language,
    status_token,
    risk_flags,
    emergency_contacts
  )
  VALUES (
    demo_hw,
    demo_zone,
    'Priya Sharma',
    24,
    '+15551230000',
    ST_SetSRID(ST_MakePoint(73.8567, 18.5204), 4326)::geography,
    'Demo Village',
    'Near the temple',
    38,
    (CURRENT_DATE + INTERVAL '2 weeks')::date,
    'B+',
    'en',
    'a0000000-1111-4222-8333-000000000001'::uuid,
    '{}'::text[],
    '[]'::jsonb
  )
  ON CONFLICT (phone_primary) DO UPDATE
  SET
    health_worker_id = EXCLUDED.health_worker_id,
    zone_id = EXCLUDED.zone_id,
    name = EXCLUDED.name,
    age = EXCLUDED.age,
    location = EXCLUDED.location,
    village = EXCLUDED.village,
    landmark = EXCLUDED.landmark,
    weeks_pregnant = EXCLUDED.weeks_pregnant,
    due_date = EXCLUDED.due_date,
    blood_type = EXCLUDED.blood_type,
    language = EXCLUDED.language,
    status_token = EXCLUDED.status_token,
    risk_flags = EXCLUDED.risk_flags,
    emergency_contacts = EXCLUDED.emergency_contacts;
END $seed$;
