-- Allow admins to view all book purchases
-- This policy allows users with admin role to view all book purchases in the system

CREATE POLICY "book_purchases_select_admin" ON public.book_purchases FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE public.profiles.id = auth.uid() 
      AND public.profiles.role = 'admin'
  )
);

