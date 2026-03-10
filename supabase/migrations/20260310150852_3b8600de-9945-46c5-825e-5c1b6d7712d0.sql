
CREATE OR REPLACE FUNCTION public.update_affiliate_totals(_affiliate_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.affiliates
  SET
    total_orders = (SELECT count(*) FROM public.affiliate_orders WHERE affiliate_id = _affiliate_id),
    total_revenue = COALESCE((SELECT sum(order_total) FROM public.affiliate_orders WHERE affiliate_id = _affiliate_id), 0),
    total_commission = COALESCE((SELECT sum(commission) FROM public.affiliate_orders WHERE affiliate_id = _affiliate_id), 0)
  WHERE id = _affiliate_id;
END;
$$;
