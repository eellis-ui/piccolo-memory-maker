ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_name text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS line_items jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS production_pdf_path text;