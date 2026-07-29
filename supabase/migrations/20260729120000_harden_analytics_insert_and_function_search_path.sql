-- analytics_events accepted any row from anyone: the INSERT policy was
-- WITH CHECK (true). That is the table used to judge ad performance, so it
-- needs to reject junk while still accepting anonymous browser events.
--
-- Constrain it to the event types the client actually fires and require a
-- session id, which is what makes funnel steps joinable. Server-side inserts
-- (shopify-order-webhook) use the service role and bypass RLS entirely, so
-- they are unaffected.
drop policy if exists "Anyone can insert analytics events" on public.analytics_events;

create policy "Anyone can insert known analytics events"
  on public.analytics_events
  for insert
  with check (
    session_id is not null
    and event_type in (
      'page_view',
      'product_view',
      'add_to_cart',
      'checkout_initiated',
      'purchase',
      'builder_upload',
      'builder_convert',
      'builder_approve',
      'builder_cover',
      'builder_checkout'
    )
  );

-- Pin the search_path so the function cannot be influenced by a caller-set
-- path. Flagged by the database linter (0011_function_search_path_mutable).
alter function public.order_photo_counts() set search_path = public;

-- Note on the remaining linter warnings for has_role(): it is reachable at
-- /rest/v1/rpc/has_role by anon and authenticated, and it cannot simply be
-- revoked. Every admin RLS policy calls has_role() in its USING clause, and a
-- policy expression is evaluated as the calling role — revoking EXECUTE would
-- make those policies error rather than return false, locking admins out and
-- breaking anonymous reads on any table carrying a {public} admin policy.
-- Closing it properly means moving the admin policies to {authenticated} first,
-- then revoking from anon. Left as a deliberate follow-up: what leaks today is
-- whether a caller-supplied uuid holds a given role, which needs the uuid up
-- front and grants nothing.
