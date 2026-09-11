-- The browser analytics session (analytics_events.session_id) that placed the
-- order, stamped at checkout so the webhook can attribute the purchase event
-- to the visitor journey that led to it.
alter table public.orders add column if not exists analytics_session_id text;
