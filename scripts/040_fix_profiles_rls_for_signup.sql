-- Fix RLS policies for profiles table to allow profile updates during signup
-- The trigger creates the profile, but users need to be able to update it with full_name

-- Drop existing update policy if it exists
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

-- Recreate update policy that allows users to update their own profile
-- This is needed after the trigger creates the profile during signup
CREATE POLICY "profiles_update_own" ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id) 
WITH CHECK (auth.uid() = id);

-- Also ensure insert policy allows users to create their own profile
-- (in case trigger doesn't run for some reason)
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;

CREATE POLICY "profiles_insert_own" ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);




























