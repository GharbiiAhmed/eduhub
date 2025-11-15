-- Allow admins to update and delete profiles
-- This policy allows users with admin role to update and delete any profile in the system

-- Allow admins to update any profile
CREATE POLICY "profiles_update_admin" ON public.profiles FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE public.profiles.id = auth.uid() 
      AND public.profiles.role = 'admin'
  )
);

-- Allow admins to delete any profile (except their own - handled in API)
CREATE POLICY "profiles_delete_admin" ON public.profiles FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE public.profiles.id = auth.uid() 
      AND public.profiles.role = 'admin'
  )
  AND id != auth.uid() -- Prevent admins from deleting themselves
);

