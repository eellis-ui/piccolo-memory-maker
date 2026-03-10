

## Affiliate Program — Gap Analysis & Implementation Plan

### What's Already Built
- Auth flow (login/signup) on `/affiliates`
- Affiliate signup form that creates a Shopify discount code via edge function
- Dashboard showing discount code, total orders, revenue, commission, and order history
- Webhook tracking: `shopify-order-webhook` matches discount codes to affiliates and records commission

### What's Missing
The only significant missing feature is **commission payout requests with a 60-day hold**.

### Plan

**1. Database: Add `affiliate_payouts` table and update `affiliate_orders`**

- Add `payout_eligible_at` column to `affiliate_orders` (set to `created_at + 60 days` via default)
- Create `affiliate_payouts` table:
  - `id`, `affiliate_id` (FK), `amount`, `status` (pending/paid/rejected), `created_at`, `paid_at`, `notes`
- RLS: affiliates can SELECT and INSERT their own payouts; admins can SELECT/UPDATE all
- Update the webhook to set `payout_eligible_at` on insert

**2. Dashboard UI: Add payout section to `/affiliates`**

- Show "Available Balance" (sum of commission from orders where `payout_eligible_at <= now()` minus already-requested payouts)
- Show "Pending Balance" (commission from orders still within the 60-day hold)
- "Request Payout" button (enabled only when available balance > 0)
- Payout history table showing request date, amount, status

**3. Admin visibility**

- Add a payouts section to the admin dashboard so payout requests can be reviewed and marked as paid

### Technical Details

```sql
-- Add eligibility date to affiliate_orders
ALTER TABLE affiliate_orders 
  ADD COLUMN payout_eligible_at timestamptz 
  DEFAULT (now() + interval '60 days');

-- Backfill existing rows
UPDATE affiliate_orders 
  SET payout_eligible_at = created_at + interval '60 days' 
  WHERE payout_eligible_at IS NULL;

-- New payouts table
CREATE TABLE affiliate_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES affiliates(id),
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  notes text
);

ALTER TABLE affiliate_payouts ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Affiliates can view own payouts" ON affiliate_payouts
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM affiliates WHERE affiliates.id = affiliate_payouts.affiliate_id 
    AND affiliates.user_id = auth.uid()
  ));

CREATE POLICY "Affiliates can request payouts" ON affiliate_payouts
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM affiliates WHERE affiliates.id = affiliate_payouts.affiliate_id 
    AND affiliates.user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all payouts" ON affiliate_payouts
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update payouts" ON affiliate_payouts
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'));
```

The dashboard will query `affiliate_orders` to compute available vs pending commission, and allow requesting a payout that inserts into `affiliate_payouts`. The admin page will show pending payout requests for manual processing.

