
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS customer_email text,
  ADD COLUMN IF NOT EXISTS digital_download boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS digital_pdf_path text;
