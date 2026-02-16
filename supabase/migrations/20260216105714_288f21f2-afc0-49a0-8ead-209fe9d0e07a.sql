
-- Create orders table
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'draft',
  title_page_enabled BOOLEAN NOT NULL DEFAULT true,
  title_page_text TEXT NOT NULL DEFAULT 'My Piccolo''d Colouring Book',
  dedication_page_enabled BOOLEAN NOT NULL DEFAULT false,
  dedication_page_text TEXT,
  cover_image_id UUID,
  cover_zoom NUMERIC NOT NULL DEFAULT 1,
  cover_position_x NUMERIC NOT NULL DEFAULT 0,
  cover_position_y NUMERIC NOT NULL DEFAULT 0,
  extra_pages INTEGER NOT NULL DEFAULT 0,
  unique_photos BOOLEAN NOT NULL DEFAULT false
);

-- Create order_photos table
CREATE TABLE public.order_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  original_path TEXT NOT NULL,
  converted_path TEXT,
  page_position INTEGER NOT NULL,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  conversion_status TEXT NOT NULL DEFAULT 'pending'
);

-- Create index on order_photos for order lookups
CREATE INDEX idx_order_photos_order_id ON public.order_photos(order_id);

-- Enable RLS on both tables (open policies for now, no auth yet)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_photos ENABLE ROW LEVEL SECURITY;

-- Open RLS policies (will be scoped to users later)
CREATE POLICY "Allow all access to orders" ON public.orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to order_photos" ON public.order_photos FOR ALL USING (true) WITH CHECK (true);

-- Create storage bucket for order files
INSERT INTO storage.buckets (id, name, public) VALUES ('order-files', 'order-files', true);

-- Storage policies for order-files bucket
CREATE POLICY "Allow public read access to order-files" ON storage.objects FOR SELECT USING (bucket_id = 'order-files');
CREATE POLICY "Allow public upload to order-files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'order-files');
CREATE POLICY "Allow public update to order-files" ON storage.objects FOR UPDATE USING (bucket_id = 'order-files');
CREATE POLICY "Allow public delete from order-files" ON storage.objects FOR DELETE USING (bucket_id = 'order-files');
