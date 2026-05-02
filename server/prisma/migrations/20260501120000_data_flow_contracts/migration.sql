-- Carry the self-registration verification flag through the SOS RPC contract.
-- SOS remains allowed for unverified patients; downstream clients display the flag.
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
  preferred_hospital_id uuid,
  registration_verified boolean
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
    p.preferred_hospital_id,
    p.registration_verified
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
  preferred_hospital_id uuid,
  registration_verified boolean
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
    p.preferred_hospital_id,
    p.registration_verified
  FROM public.patients p
  WHERE p.id = p_id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_patient_for_sos(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_patient_for_sos_by_id(uuid) TO service_role;

ALTER TABLE public.hospital_alert_acks
  DROP CONSTRAINT IF EXISTS hospital_alert_acks_ack_type_check;

ALTER TABLE public.hospital_alert_acks
  ADD CONSTRAINT hospital_alert_acks_ack_type_check
  CHECK (ack_type IN ('ready', 'more_info', 'arrived_sms'));

-- Reassert volunteer YES ordering for realtime: alerts first, alert_responses second.
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
