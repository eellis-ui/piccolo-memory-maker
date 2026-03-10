

## Problem

The RLS policies on the `reviews` table are **still RESTRICTIVE** (confirmed in the current schema: every policy shows `Permissive: No`). Previous migrations failed to fix this. With restrictive policies, anonymous users must pass ALL policies — including the admin-only one — which always fails, blocking all reads.

## Plan

### 1. Database migration — recreate all reviews policies as PERMISSIVE

Drop every existing policy on `public.reviews` and recreate them without `AS RESTRICTIVE`:

```sql
DROP POLICY IF EXISTS "Anyone can read approved reviews" ON public.reviews;
DROP POLICY IF EXISTS "Admins can view all reviews" ON public.reviews;
DROP POLICY IF EXISTS "Anyone can submit a review" ON public.reviews;
DROP POLICY IF EXISTS "Admins can update reviews" ON public.reviews;
DROP POLICY IF EXISTS "Admins can delete reviews" ON public.reviews;

CREATE POLICY "Anyone can read approved reviews"
  ON public.reviews FOR SELECT TO public
  USING (is_approved = true);

CREATE POLICY "Admins can view all reviews"
  ON public.reviews FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can submit a review"
  ON public.reviews FOR INSERT TO public
  WITH CHECK (true);

CREATE POLICY "Admins can update reviews"
  ON public.reviews FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete reviews"
  ON public.reviews FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
```

### 2. No code changes needed

The component already has timeout handling and correct query logic. Once policies are actually permissive, reviews will load.

