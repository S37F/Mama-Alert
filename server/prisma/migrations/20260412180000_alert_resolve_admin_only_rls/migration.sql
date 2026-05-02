-- Match API: only zone admins may UPDATE alerts (e.g. resolve). Field health workers monitor only.
DROP POLICY IF EXISTS alert_access_update_alerts ON public.alerts;

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
        AND hw.access_level = 'admin'
        AND hw.zone_id IS NOT NULL
        AND hw.zone_id = p.zone_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.patients p
      JOIN public.health_workers hw ON hw.user_id = auth.uid()
      WHERE p.id = patient_id
        AND hw.access_level = 'admin'
        AND hw.zone_id IS NOT NULL
        AND hw.zone_id = p.zone_id
    )
  );
