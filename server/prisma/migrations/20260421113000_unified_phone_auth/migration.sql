ALTER TABLE public.health_workers
  DROP CONSTRAINT IF EXISTS health_workers_user_id_fkey;

ALTER TABLE public.health_workers
  ADD COLUMN IF NOT EXISTS phone_e164 TEXT GENERATED ALWAYS AS (public.normalize_phone_for_match(phone)) STORED,
  ADD COLUMN IF NOT EXISTS organisation TEXT,
  ADD COLUMN IF NOT EXISTS role_title TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS health_workers_phone_e164_uidx
  ON public.health_workers (phone_e164)
  WHERE phone_e164 IS NOT NULL;

ALTER TABLE public.volunteers
  DROP CONSTRAINT IF EXISTS volunteers_vehicle_check;

ALTER TABLE public.volunteers
  ADD CONSTRAINT volunteers_vehicle_check
  CHECK (vehicle IN ('none', 'motorcycle', 'car', 'ambulance', 'bicycle'));
