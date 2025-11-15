-- Allow admins to view all enrollments
-- This policy allows users with admin role to view all enrollments in the system

CREATE POLICY "enrollments_select_admin" ON public.enrollments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE public.profiles.id = auth.uid() 
      AND public.profiles.role = 'admin'
  )
);

