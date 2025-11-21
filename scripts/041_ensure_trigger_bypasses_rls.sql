-- Ensure the trigger function properly bypasses RLS
-- The trigger should create profiles without RLS restrictions

-- Verify the trigger function has SECURITY DEFINER
-- This ensures it runs with the privileges of the function owner (postgres)
-- and bypasses RLS policies

-- Recreate the trigger function to ensure it has proper security settings
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
  
  -- Insert profile - SECURITY DEFINER bypasses RLS
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

-- Grant necessary permissions to the function
-- The function owner (usually postgres) should have full access
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, anon, authenticated, service_role;







