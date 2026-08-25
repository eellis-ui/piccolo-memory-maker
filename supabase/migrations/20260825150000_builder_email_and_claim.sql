-- The "save your book" email can differ from the email later typed at
-- Shopify checkout (which the order webhook writes into customer_email).
-- Keep the builder-captured address in its own column so it survives, and
-- let account claiming match on either — whichever email the customer
-- signs up with, their orders follow them.

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS builder_email text;

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
    OR (caller_email <> '' AND lower(builder_email) = caller_email)
  );
  GET DIAGNOSTICS claimed_count = ROW_COUNT;
  RETURN claimed_count;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.claim_orders_for_user(uuid, text, text) FROM anon;
