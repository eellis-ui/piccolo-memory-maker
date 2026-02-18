
-- Add tracking_number column to orders
ALTER TABLE public.orders ADD COLUMN tracking_number text;

-- Add shipped_at timestamp
ALTER TABLE public.orders ADD COLUMN shipped_at timestamp with time zone;
