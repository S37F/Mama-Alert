CREATE OR REPLACE FUNCTION public.normalize_phone_for_match(p text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE
    WHEN p IS NULL OR btrim(p) = '' THEN ''
    WHEN btrim(p) LIKE '+%' THEN '+' || regexp_replace(substring(btrim(p) from 2), '\D', '', 'g')
    ELSE regexp_replace(btrim(p), '\D', '', 'g')
  END;
$$;

-- Force stored generated phone_e164 columns to recalculate with the stricter normalizer.
UPDATE public.patients SET phone_primary = phone_primary;
UPDATE public.volunteers SET phone = phone;
UPDATE public.health_workers SET phone = phone WHERE phone IS NOT NULL;
