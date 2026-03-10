
-- Drop ALL existing policies on reviews (they are RESTRICTIVE)
DROP POLICY IF EXISTS "Anyone can read approved reviews" ON public.reviews;
DROP POLICY IF EXISTS "Admins can view all reviews" ON public.reviews;
DROP POLICY IF EXISTS "Anyone can submit a review" ON public.reviews;
DROP POLICY IF EXISTS "Admins can update reviews" ON public.reviews;
DROP POLICY IF EXISTS "Admins can delete reviews" ON public.reviews;

-- Recreate as explicitly PERMISSIVE
CREATE POLICY "Anyone can read approved reviews"
  ON public.reviews AS PERMISSIVE FOR SELECT TO public
  USING (is_approved = true);

CREATE POLICY "Admins can view all reviews"
  ON public.reviews AS PERMISSIVE FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can submit a review"
  ON public.reviews AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (true);

CREATE POLICY "Admins can update reviews"
  ON public.reviews AS PERMISSIVE FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete reviews"
  ON public.reviews AS PERMISSIVE FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
