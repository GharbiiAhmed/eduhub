-- Disable direct client inserts into profiles table
-- Only allow inserts through the trigger (SECURITY DEFINER) or service role
-- This prevents any cached client code from trying to insert directly

-- Drop the client insert policy - clients should NOT be able to insert directly
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;

-- The trigger handles all profile creation with SECURITY DEFINER
-- Clients should only be able to UPDATE their own profile after it's created by the trigger
-- This prevents RLS errors from cached client code trying to insert

-- Keep the update policy so users can update their own profile
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

CREATE POLICY "profiles_update_own" ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id) 
WITH CHECK (auth.uid() = id);

-- Keep the select policy so users can read their own profile
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;

CREATE POLICY "profiles_select_own" ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Verify the trigger function has SECURITY DEFINER and is working
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
































