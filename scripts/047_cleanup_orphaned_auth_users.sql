-- Cleanup script to identify and remove orphaned auth users
-- Orphaned users are those in auth.users but without a corresponding profile
-- 
-- WARNING: This script only identifies orphaned users
-- To actually delete them, you need to use the Supabase Admin API or dashboard
-- 
-- Run this query to see orphaned users:
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

-- To delete orphaned users, you need to use the Supabase Admin API
-- Or manually delete them from the Supabase dashboard under Authentication > Users
--
-- Example using Supabase Admin API (Node.js/TypeScript):
-- 
-- import { createClient } from '@supabase/supabase-js'
-- 
-- const supabaseAdmin = createClient(
--   process.env.NEXT_PUBLIC_SUPABASE_URL!,
--   process.env.SUPABASE_SERVICE_ROLE_KEY!,
--   {
--     auth: {
--       autoRefreshToken: false,
--       persistSession: false,
--     },
--   }
-- )
-- 
-- // Get orphaned user IDs
-- const { data: orphanedUsers } = await supabaseAdmin
--   .from('auth.users')
--   .select('id')
--   .not('id', 'in', 
--     supabaseAdmin.from('profiles').select('id')
--   )
-- 
-- // Delete each orphaned user
-- for (const user of orphanedUsers) {
--   await supabaseAdmin.auth.admin.deleteUser(user.id)
-- }

















