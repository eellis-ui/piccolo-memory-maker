-- What Shopify actually charged for the order (whole order, in the buyer's
-- presentment currency). Written by shopify-order-webhook so the browser-side
-- Meta Purchase can report the same value/currency as the server-side one.
alter table public.orders
  add column if not exists order_total numeric,
  add column if not exists order_currency text;
