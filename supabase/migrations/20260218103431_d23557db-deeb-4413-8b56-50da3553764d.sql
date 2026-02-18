
-- Allow admins to delete any order
CREATE POLICY "Admins can delete all orders"
ON public.orders
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
