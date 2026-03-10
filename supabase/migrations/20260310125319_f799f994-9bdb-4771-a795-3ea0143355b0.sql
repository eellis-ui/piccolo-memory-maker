
CREATE OR REPLACE FUNCTION public.claim_orders_for_user(_user_id uuid, _email text, _session_id text DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claimed_count integer;
BEGIN
  -- Claim orders matching session ID or customer email where user_id is not yet set
  UPDATE public.orders
  SET user_id = _user_id
  WHERE user_id IS NULL
    AND (
      (_session_id IS NOT NULL AND builder_session_id = _session_id::uuid)
      OR
      (_email IS NOT NULL AND lower(customer_email) = lower(_email))
    );

  GET DIAGNOSTICS claimed_count = ROW_COUNT;
  RETURN claimed_count;
END;
$$;
