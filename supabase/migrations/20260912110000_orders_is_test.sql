-- Team test orders (100%-off codes, Shopify test gateway) are real rows in
-- Shopify and here, but must never count as conversions in analytics or Meta.
alter table public.orders add column if not exists is_test boolean not null default false;
