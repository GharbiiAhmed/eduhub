-- Diagnostic queries to check if profiles are being created correctly
-- Run these queries to verify the trigger is working

-- 1. Check if the trigger function exists and has SECURITY DEFINER
SELECT 
  proname as function_name,
  prosecdef as is_security_definer,
  proconfig as settings,
  pg_get_functiondef(oid) as function_definition
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- 2. Check if the trigger exists and is enabled
SELECT 
  tgname as trigger_name,
  tgenabled as is_enabled,
  tgrelid::regclass as table_name,
  proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname = 'on_auth_user_created';

-- 3. Check recent profiles to see if they have UTF-8 characters
-- Look for profiles created in the last hour
SELECT 
  id,
  email,
  full_name,
  role,
  status,
  created_at,
  length(full_name) as name_length,
  encode(convert_to(full_name, 'UTF8'), 'hex') as utf8_hex
FROM public.profiles
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 10;

-- 4. Check the RLS policy
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profiles' AND policyname = 'profiles_insert_own';

-- 5. Test: Check if a specific user's profile exists (replace USER_ID)
-- SELECT * FROM public.profiles WHERE id = 'USER_ID';

-- 6. Check for any trigger execution errors in PostgreSQL logs
-- (This requires access to PostgreSQL logs, which may not be available in Supabase dashboard)





























