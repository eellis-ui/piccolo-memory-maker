-- Persistent browser identity (localStorage) so one person's sessions across
-- tabs and days can be stitched into a single journey in the admin.
alter table public.analytics_events add column if not exists visitor_id text;
create index if not exists analytics_events_visitor_id_idx on public.analytics_events (visitor_id);
create index if not exists analytics_events_created_at_idx on public.analytics_events (created_at);
-- Stamped on orders at creation/checkout so a build (and the email/name it
-- later collects) can be tied back to the visitor who made it.
alter table public.orders add column if not exists analytics_visitor_id text;
