

## Problem

The reviews section shows an infinite loading spinner because **all RLS policies on the `reviews` table are RESTRICTIVE**. In PostgreSQL, restrictive policies require ALL to pass. An anonymous visitor fails the "Admins can view all reviews" check, which blocks their access entirely — even though "Anyone can read approved reviews" should grant it.

The previous migration attempted to fix this but created the policies as restrictive again.

## Plan

### 1. Fix RLS policies on the `reviews` table (database migration)

Drop all existing policies and recreate them as **PERMISSIVE** (the PostgreSQL default):

- **SELECT** (public): `is_approved = true` — anyone can read approved reviews
- **SELECT** (authenticated): `has_role(auth.uid(), 'admin')` — admins see all
- **INSERT** (public): `WITH CHECK (true)` — anyone can submit
- **UPDATE** (authenticated): admins only
- **DELETE** (authenticated): admins only

### 2. No code changes needed

The `CustomerReviewsSection` component already has the full Judge.me-style functionality:
- Aggregate rating summary with star distribution bars
- Interactive star rating form
- Name, email, and review text submission
- Baseline of ~3,947 legacy reviews for social proof
- Individual review cards with verified badges
- "Show All" pagination

The component is already rendered in `PricingSection`. Once the RLS fix is applied, it will load and display correctly.

