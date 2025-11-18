-- Add a safe insert policy for profiles table
-- This allows users to insert their own profile as a fallback if the trigger fails
-- The policy ensures users can only insert their own profile (auth.uid() = id)
-- This prevents RLS errors from cached client code trying to insert

-- Drop the policy if it exists, then recreate it
-- This policy allows users to insert their own profile row
-- Only allows insert if the user is authenticated and the id matches their auth.uid()
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;

CREATE POLICY "profiles_insert_own" ON public.profiles 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = id
);

-- Ensure the trigger function is properly configured with SECURITY DEFINER
-- This is the primary mechanism for profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  user_role TEXT;
  user_status TEXT;
  user_full_name TEXT;
BEGIN
  user_role := COALESCE(new.raw_user_meta_data ->> 'role', 'student');
  user_full_name := new.raw_user_meta_data ->> 'full_name';
  
  -- Students are auto-approved, Instructors need approval
  IF user_role = 'instructor' THEN
    user_status := 'pending';
  ELSE
    user_status := 'approved';
  END IF;
  
  -- Insert profile - SECURITY DEFINER bypasses RLS completely
  INSERT INTO public.profiles (id, email, role, status, full_name)
  VALUES (
    new.id,
    new.email,
    user_role,
    user_status,
    user_full_name
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    role = COALESCE(EXCLUDED.role, profiles.role),
    status = COALESCE(EXCLUDED.status, profiles.status),
    email = COALESCE(EXCLUDED.email, profiles.email);
  
  RETURN new;
END;
$$;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant execute permission to the trigger function
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, anon, authenticated, service_role;

-- Verify the policy was created successfully
-- Run this query to check: SELECT * FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_insert_own';

