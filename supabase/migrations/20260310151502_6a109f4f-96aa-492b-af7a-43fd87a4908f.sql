
-- Reviews table
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_name text NOT NULL,
  email text,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text NOT NULL,
  is_verified boolean NOT NULL DEFAULT false,
  is_approved boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read approved reviews (public-facing)
CREATE POLICY "Anyone can read approved reviews"
  ON public.reviews FOR SELECT
  TO public
  USING (is_approved = true);

-- Anyone can submit a review (no auth required)
CREATE POLICY "Anyone can submit a review"
  ON public.reviews FOR INSERT
  TO public
  WITH CHECK (true);

-- Admins can manage all reviews
CREATE POLICY "Admins can view all reviews"
  ON public.reviews FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update reviews"
  ON public.reviews FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete reviews"
  ON public.reviews FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed existing hardcoded reviews
INSERT INTO public.reviews (reviewer_name, rating, review_text, is_verified, is_approved, created_at) VALUES
  ('Anonymous', 5, 'These are absolutely amazing! We love them so much. The quality is fantastic and the line art is so detailed. Already ordered a second one!', true, true, '2026-02-23T12:00:00Z'),
  ('Makeba', 5, 'Beautiful product just as advertised. My daughter was thrilled to see her photos turned into coloring pages. Will definitely order again.', true, true, '2026-02-08T12:00:00Z'),
  ('Paul H', 5, 'Fun project to have someone do. I gave it to my wife for her birthday and she absolutely loved flipping through the pages seeing our memories as line art.', true, true, '2026-01-29T12:00:00Z'),
  ('Karen Ryan', 5, 'Loved the product. Great quality and fast shipping. The coloring book turned out beautifully.', false, true, '2026-01-28T12:00:00Z'),
  ('Karina F.', 5, 'Very happy with my order! The book arrived quickly and the print quality exceeded my expectations. Such a unique and personal gift idea.', true, true, '2026-01-28T12:00:00Z');
