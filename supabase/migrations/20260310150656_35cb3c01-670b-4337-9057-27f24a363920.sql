
-- Affiliates table
CREATE TABLE public.affiliates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name text NOT NULL,
  email text NOT NULL,
  instagram_handle text,
  tiktok_handle text,
  discount_code text NOT NULL UNIQUE,
  shopify_price_rule_id text,
  total_orders integer NOT NULL DEFAULT 0,
  total_revenue numeric NOT NULL DEFAULT 0,
  total_commission numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;

-- Affiliates can view their own record
CREATE POLICY "Users can view own affiliate record"
  ON public.affiliates FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Affiliates can update their own record (limited fields)
CREATE POLICY "Users can update own affiliate record"
  ON public.affiliates FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all affiliates
CREATE POLICY "Admins can view all affiliates"
  ON public.affiliates FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update all affiliates
CREATE POLICY "Admins can update all affiliates"
  ON public.affiliates FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert policy for authenticated users (signup)
CREATE POLICY "Authenticated users can create affiliate record"
  ON public.affiliates FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Affiliate orders tracking table
CREATE TABLE public.affiliate_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid REFERENCES public.affiliates(id) ON DELETE CASCADE NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  shopify_order_number text,
  order_total numeric NOT NULL DEFAULT 0,
  commission numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliate_orders ENABLE ROW LEVEL SECURITY;

-- Affiliates can view their own orders
CREATE POLICY "Affiliates can view own orders"
  ON public.affiliate_orders FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.affiliates
    WHERE affiliates.id = affiliate_orders.affiliate_id
    AND affiliates.user_id = auth.uid()
  ));

-- Admins can view all affiliate orders
CREATE POLICY "Admins can view all affiliate orders"
  ON public.affiliate_orders FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
