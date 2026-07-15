-- 1. Harden claim_orders_for_user: derive identity from the JWT, not caller args.
--    Previously any anonymous caller could assign any customer's guest orders
--    (matched by email) to an arbitrary user_id.
CREATE OR REPLACE FUNCTION public.claim_orders_for_user(_user_id uuid, _email text, _session_id text DEFAULT NULL::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  claimed_count integer;
  caller_id uuid := auth.uid();
  caller_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
BEGIN
  IF caller_id IS NULL THEN
    RETURN 0;
  END IF;
  UPDATE public.orders SET user_id = caller_id
  WHERE user_id IS NULL AND (
    (_session_id IS NOT NULL AND builder_session_id = _session_id::uuid)
    OR (caller_email <> '' AND lower(customer_email) = caller_email)
  );
  GET DIAGNOSTICS claimed_count = ROW_COUNT;
  RETURN claimed_count;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.claim_orders_for_user(uuid, text, text) FROM anon;

-- 2. RLS initplan fix: wrap per-row auth calls so they evaluate once per query
--    (Supabase advisor: auth_rls_initplan) on the hot tables.
ALTER POLICY "Users can view own orders" ON public.orders USING ((select auth.uid()) = user_id);
ALTER POLICY "Users can create own orders" ON public.orders WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY "Users can update own orders" ON public.orders USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY "Users can delete own orders" ON public.orders USING ((select auth.uid()) = user_id);
ALTER POLICY "Admins can view all orders" ON public.orders USING ((select has_role((select auth.uid()), 'admin'::app_role)));
ALTER POLICY "Admins can update all orders" ON public.orders USING ((select has_role((select auth.uid()), 'admin'::app_role)));
ALTER POLICY "Admins can delete all orders" ON public.orders USING ((select has_role((select auth.uid()), 'admin'::app_role)));

ALTER POLICY "Users can view own order photos" ON public.order_photos USING (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_photos.order_id AND orders.user_id = (select auth.uid())));
ALTER POLICY "Users can create own order photos" ON public.order_photos WITH CHECK (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_photos.order_id AND orders.user_id = (select auth.uid())));
ALTER POLICY "Users can update own order photos" ON public.order_photos USING (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_photos.order_id AND orders.user_id = (select auth.uid())));
ALTER POLICY "Users can delete own order photos" ON public.order_photos USING (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_photos.order_id AND orders.user_id = (select auth.uid())));
ALTER POLICY "Admins can view all order photos" ON public.order_photos USING ((select has_role((select auth.uid()), 'admin'::app_role)));
ALTER POLICY "Admins can delete all order photos" ON public.order_photos USING ((select has_role((select auth.uid()), 'admin'::app_role)));

ALTER POLICY "Users can view own roles" ON public.user_roles USING ((select auth.uid()) = user_id);
ALTER POLICY "Admins can view all roles" ON public.user_roles USING ((select has_role((select auth.uid()), 'admin'::app_role)));
ALTER POLICY "Admins can insert roles" ON public.user_roles WITH CHECK ((select has_role((select auth.uid()), 'admin'::app_role)));
ALTER POLICY "Admins can delete roles" ON public.user_roles USING ((select has_role((select auth.uid()), 'admin'::app_role)));

-- 3. Covering indexes for unindexed foreign keys (advisor: unindexed_foreign_keys)
CREATE INDEX IF NOT EXISTS idx_affiliate_orders_affiliate_id ON public.affiliate_orders (affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_orders_order_id ON public.affiliate_orders (order_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_payouts_affiliate_id ON public.affiliate_payouts (affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_reward_submissions_affiliate_id ON public.affiliate_reward_submissions (affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_submissions_challenge_id ON public.affiliate_submissions (challenge_id);
-- order_photos.order_id is queried constantly by the app as well
CREATE INDEX IF NOT EXISTS idx_order_photos_order_id ON public.order_photos (order_id);

-- 4. Grouped photo counts for the admin dashboard (replaces fetching every
--    order_photos row to count client-side). SECURITY INVOKER: RLS applies.
CREATE OR REPLACE FUNCTION public.order_photo_counts()
 RETURNS TABLE(order_id uuid, photo_count bigint)
 LANGUAGE sql
 STABLE
AS $function$
  SELECT order_id, count(*) FROM public.order_photos GROUP BY order_id;
$function$;
