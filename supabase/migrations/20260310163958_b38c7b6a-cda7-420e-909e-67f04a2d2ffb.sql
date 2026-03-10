
-- Add payout eligibility date to affiliate_orders
ALTER TABLE affiliate_orders 
  ADD COLUMN payout_eligible_at timestamptz DEFAULT (now() + interval '60 days');

-- Backfill existing rows
UPDATE affiliate_orders 
  SET payout_eligible_at = created_at + interval '60 days' 
  WHERE payout_eligible_at IS NULL;

-- Create affiliate_payouts table
CREATE TABLE affiliate_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  notes text
);

ALTER TABLE affiliate_payouts ENABLE ROW LEVEL SECURITY;

-- RLS: Affiliates can view own payouts
CREATE POLICY "Affiliates can view own payouts" ON affiliate_payouts
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM affiliates WHERE affiliates.id = affiliate_payouts.affiliate_id 
    AND affiliates.user_id = auth.uid()
  ));

-- RLS: Affiliates can request payouts
CREATE POLICY "Affiliates can request payouts" ON affiliate_payouts
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM affiliates WHERE affiliates.id = affiliate_payouts.affiliate_id 
    AND affiliates.user_id = auth.uid()
  ));

-- RLS: Admins can view all payouts
CREATE POLICY "Admins can view all payouts" ON affiliate_payouts
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS: Admins can update payouts
CREATE POLICY "Admins can update payouts" ON affiliate_payouts
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
