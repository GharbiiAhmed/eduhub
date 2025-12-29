-- SQL script to identify orphaned auth users
-- Note: You cannot delete auth users directly via SQL
-- You must use the Supabase Admin API or the TypeScript script
--
-- This script helps you identify which users need to be deleted

-- Find all orphaned users (users in auth.users without profiles)
SELECT 
  au.id,
  au.email,
  au.created_at,
  au.last_sign_in_at,
  au.email_confirmed_at,
  CASE 
    WHEN p.id IS NULL THEN 'ORPHANED - No profile'
    ELSE 'Has profile'
  END as status
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL
ORDER BY au.created_at DESC;

-- To delete the specific user: 6680c6a7-5470-47c1-918e-f8ca11e89754
-- You need to use one of these methods:
--
-- Method 1: Use the TypeScript script (Recommended)
--   npx tsx scripts/048_delete_orphaned_auth_user.ts 6680c6a7-5470-47c1-918e-f8ca11e89754
--
-- Method 2: Use the API endpoint (if you have admin access)
--   POST /api/admin/users/cleanup-orphaned
--
-- Method 3: Use Supabase Dashboard
--   1. Go to Authentication > Users
--   2. Find the user by email: hajriyassine383@gmail.com
--   3. Click the three dots menu
--   4. Select "Delete user"





















