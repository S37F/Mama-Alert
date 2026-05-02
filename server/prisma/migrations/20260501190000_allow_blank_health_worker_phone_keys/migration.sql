DROP INDEX IF EXISTS public.health_workers_phone_e164_uidx;

CREATE UNIQUE INDEX health_workers_phone_e164_uidx
  ON public.health_workers (phone_e164)
  WHERE phone_e164 IS NOT NULL AND phone_e164 <> '';
