-- "Save your book" email capture: visitors can leave their email in the
-- builder; send-build-reminders (hourly, via pg_cron) nudges stalled builds
-- once. reminder_sent_at doubles as the claim marker that prevents repeats.

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_orders_reminder_candidates
  ON public.orders (created_at)
  WHERE status = 'draft' AND customer_email IS NOT NULL AND reminder_sent_at IS NULL;

SELECT cron.schedule(
  'send-build-reminders-hourly',
  '30 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://msvcchcmxyghvpfscsmy.supabase.co/functions/v1/send-build-reminders',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{}'::jsonb
  ) AS request_id;
  $cron$
);
