-- Verify trigger is working and create profile if missing
-- Run this script to ensure the trigger is active and create missing profiles

-- Step 1: Verify the trigger exists and is enabled
SELECT 
  tgname as trigger_name,
  tgenabled as is_enabled,
  tgrelid::regclass as table_name,
  proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname = 'on_auth_user_created';

-- Step 2: Check if the trigger function has SECURITY DEFINER
SELECT 
  proname as function_name,
  prosecdef as is_security_definer,
  proconfig as settings
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- Step 3: Check for users without profiles
SELECT 
  au.id,
  au.email,
  au.created_at,
  au.email_confirmed_at,
  CASE 
    WHEN p.id IS NULL THEN 'MISSING PROFILE'
    ELSE 'Profile exists'
  END as profile_status
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL
ORDER BY au.created_at DESC;

-- Step 4: Create missing profile for specific user (if needed)
-- Replace USER_ID with the actual user ID
-- This uses the same logic as the trigger
DO $$
DECLARE
  target_user_id UUID := '49fa1e0a-92c0-437f-bd80-e6a71152856c';
  user_email TEXT;
  user_role TEXT;
  user_status TEXT;
  user_full_name TEXT;
  auth_user_record RECORD;
BEGIN
  -- Get user from auth.users
  SELECT 
    email,
    raw_user_meta_data
  INTO auth_user_record
  FROM auth.users
  WHERE id = target_user_id;
  
  IF NOT FOUND THEN
    RAISE NOTICE 'User % not found in auth.users', target_user_id;
    RETURN;
  END IF;
  
  -- Check if profile already exists
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = target_user_id) THEN
    RAISE NOTICE 'Profile already exists for user %', target_user_id;
    RETURN;
  END IF;
  
  -- Extract metadata
  user_email := auth_user_record.email;
  user_role := COALESCE(auth_user_record.raw_user_meta_data ->> 'role', 'student')::TEXT;
  user_full_name := COALESCE(auth_user_record.raw_user_meta_data ->> 'full_name', '')::TEXT;
  
  -- Determine status
  IF user_role = 'instructor' THEN
    user_status := 'pending'::TEXT;
  ELSE
    user_status := 'approved'::TEXT;
  END IF;
  
  -- Create profile
  INSERT INTO public.profiles (id, email, role, status, full_name)
  VALUES (
    target_user_id,
    user_email,
    user_role,
    user_status,
    user_full_name
  );
  
  RAISE NOTICE 'Profile created for user % (email: %)', target_user_id, user_email;
END $$;


























