CREATE TABLE IF NOT EXISTS public.alert_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id uuid NOT NULL REFERENCES public.alerts(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  actor_type text,
  actor_id text,
  channel text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  request_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS alert_events_alert_created_idx
  ON public.alert_events(alert_id, created_at);

CREATE TABLE IF NOT EXISTS public.outbound_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id uuid REFERENCES public.alerts(id) ON DELETE SET NULL,
  recipient text NOT NULL,
  provider text NOT NULL,
  provider_message_id text,
  channel text NOT NULL DEFAULT 'sms',
  status text NOT NULL DEFAULT 'queued',
  error text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  request_id text,
  status_updated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS outbound_messages_alert_created_idx
  ON public.outbound_messages(alert_id, created_at);

CREATE INDEX IF NOT EXISTS outbound_messages_provider_message_idx
  ON public.outbound_messages(provider_message_id);
