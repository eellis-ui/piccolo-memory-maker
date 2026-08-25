-- Purchase events can now arrive from two places: the shopify-order-webhook
-- (server-side, fires the moment Shopify confirms payment) and the builder's
-- payment poller (client-side, fires only if the customer returns to the tab).
-- Both stamp metadata->>'shopifyOrderNumber', so dedupe on that: the first
-- insert for an order number wins, later ones are dropped silently.

create or replace function public.dedup_purchase_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.event_type = 'purchase'
     and coalesce(new.metadata->>'shopifyOrderNumber', '') <> '' then
    if exists (
      select 1 from public.analytics_events
      where event_type = 'purchase'
        and metadata->>'shopifyOrderNumber' = new.metadata->>'shopifyOrderNumber'
    ) then
      return null;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_dedup_purchase_events on public.analytics_events;
create trigger trg_dedup_purchase_events
  before insert on public.analytics_events
  for each row
  execute function public.dedup_purchase_events();

-- Backstop for the race the trigger can't see (two concurrent inserts both
-- passing the exists() check). The second insert errors instead of landing;
-- both writers treat analytics insert errors as non-fatal.
create unique index if not exists uq_analytics_purchase_order
  on public.analytics_events ((metadata->>'shopifyOrderNumber'))
  where event_type = 'purchase' and (metadata->>'shopifyOrderNumber') is not null;
