
-- Drop all existing RESTRICTIVE policies on reviews
DROP POLICY IF EXISTS "Anyone can read approved reviews" ON public.reviews;
DROP POLICY IF EXISTS "Admins can view all reviews" ON public.reviews;
DROP POLICY IF EXISTS "Anyone can submit a review" ON public.reviews;
DROP POLICY IF EXISTS "Admins can update reviews" ON public.reviews;
DROP POLICY IF EXISTS "Admins can delete reviews" ON public.reviews;

-- Recreate as PERMISSIVE (default)
CREATE POLICY "Anyone can read approved reviews"
  ON public.reviews FOR SELECT TO public
  USING (is_approved = true);

CREATE POLICY "Admins can view all reviews"
  ON public.reviews FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can submit a review"
  ON public.reviews FOR INSERT TO public
  WITH CHECK (true);

CREATE POLICY "Admins can update reviews"
  ON public.reviews FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete reviews"
  ON public.reviews FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
