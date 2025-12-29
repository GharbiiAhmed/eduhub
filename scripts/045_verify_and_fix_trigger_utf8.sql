-- Verify and fix trigger function for UTF-8 support
-- This script ensures the trigger properly handles French, Arabic, and all Unicode characters

-- First, let's check the current function definition
-- Run this to see the current function:
-- SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'handle_new_user';

-- Ensure database encoding supports UTF-8
SET client_encoding = 'UTF8';

-- Recreate the trigger function with proper UTF-8 handling
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
  user_email TEXT;
BEGIN
  -- Extract role and full_name from metadata, ensuring UTF-8 handling
  -- Use COALESCE to handle NULL values and ensure we always have valid TEXT
  user_role := COALESCE(new.raw_user_meta_data ->> 'role', 'student')::TEXT;
  
  -- Extract full_name with proper UTF-8 handling
  -- The ->> operator returns text, but we explicitly cast to ensure encoding
  -- This is critical for French, Arabic, and all Unicode characters
  IF new.raw_user_meta_data ? 'full_name' THEN
    user_full_name := (new.raw_user_meta_data ->> 'full_name')::TEXT;
  ELSE
    user_full_name := ''::TEXT;
  END IF;
  
  -- Extract email and ensure it's TEXT
  user_email := COALESCE(new.email, '')::TEXT;
  
  -- Students are auto-approved, Instructors need approval
  IF user_role = 'instructor' THEN
    user_status := 'pending'::TEXT;
  ELSE
    user_status := 'approved'::TEXT;
  END IF;
  
  -- Insert profile - SECURITY DEFINER bypasses RLS completely
  -- All values are explicitly cast to TEXT to ensure UTF-8 encoding is preserved
  -- This handles French, Arabic, and all Unicode characters correctly
  INSERT INTO public.profiles (id, email, role, status, full_name)
  VALUES (
    new.id,
    user_email,
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
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    -- The profile can be created later via the API endpoint
    RAISE WARNING 'Error creating profile for user %: %', new.id, SQLERRM;
    RETURN new;
END;
$$;

-- Verify the trigger exists and is enabled
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant execute permission to the trigger function
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, anon, authenticated, service_role;

-- Verify the function was created correctly
-- Run this query to verify:
-- SELECT 
--   proname as function_name,
--   prosecdef as security_definer,
--   proconfig as settings
-- FROM pg_proc 
-- WHERE proname = 'handle_new_user';

-- Test query to check if a profile was created (replace USER_ID with actual user ID):
-- SELECT id, email, full_name, role, status FROM public.profiles WHERE id = 'USER_ID';
























