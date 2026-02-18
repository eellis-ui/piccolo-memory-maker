
-- Allow admins to delete order photos
CREATE POLICY "Admins can delete all order photos"
ON public.order_photos
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
