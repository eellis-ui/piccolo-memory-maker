
-- Step 1: Add user_id to orders (nullable initially for existing data)
ALTER TABLE public.orders ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Step 2: Drop existing permissive RLS policies
DROP POLICY IF EXISTS "Allow all access to orders" ON public.orders;
DROP POLICY IF EXISTS "Allow all access to order_photos" ON public.order_photos;

-- Step 3: Create user-scoped RLS policies for orders
CREATE POLICY "Users can view own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own orders"
  ON public.orders FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own orders"
  ON public.orders FOR DELETE
  USING (auth.uid() = user_id);

-- Step 4: Create user-scoped RLS policies for order_photos (via order ownership)
CREATE POLICY "Users can view own order photos"
  ON public.order_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_photos.order_id
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own order photos"
  ON public.order_photos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_photos.order_id
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own order photos"
  ON public.order_photos FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_photos.order_id
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own order photos"
  ON public.order_photos FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_photos.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- Step 5: Make storage bucket private
UPDATE storage.buckets SET public = false WHERE id = 'order-files';

-- Step 6: Drop existing public storage policies
DROP POLICY IF EXISTS "Allow public read access to order-files" ON storage.objects;
DROP POLICY IF EXISTS "Allow public upload to order-files" ON storage.objects;
DROP POLICY IF EXISTS "Allow public update to order-files" ON storage.objects;
DROP POLICY IF EXISTS "Allow public delete from order-files" ON storage.objects;

-- Step 7: Create user-scoped storage policies
CREATE POLICY "Users can upload own order files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'order-files' AND
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id::text = (storage.foldername(name))[2]
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can read own order files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'order-files' AND
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id::text = (storage.foldername(name))[2]
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own order files"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'order-files' AND
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id::text = (storage.foldername(name))[2]
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own order files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'order-files' AND
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id::text = (storage.foldername(name))[2]
      AND orders.user_id = auth.uid()
    )
  );
