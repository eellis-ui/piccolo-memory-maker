
-- Track which builder step each order is at and group multi-book orders together
ALTER TABLE public.orders 
  ADD COLUMN builder_step text NOT NULL DEFAULT 'upload',
  ADD COLUMN builder_session_id uuid;

-- Index for fast lookup of draft sessions
CREATE INDEX idx_orders_builder_session ON public.orders (builder_session_id) WHERE builder_session_id IS NOT NULL;
CREATE INDEX idx_orders_draft_user ON public.orders (user_id, status) WHERE status = 'draft';
