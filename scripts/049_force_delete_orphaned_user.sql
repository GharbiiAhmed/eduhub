-- Force delete orphaned auth user
-- This script helps diagnose and fix issues preventing user deletion
--
-- User ID: 6680c6a7-5470-47c1-918e-f8ca11e89754
-- Email: hajriyassine383@gmail.com

-- Step 1: Verify the user is orphaned (no profile exists)
SELECT 
  'Checking if user has profile...' as step,
  CASE 
    WHEN EXISTS (SELECT 1 FROM public.profiles WHERE id = '6680c6a7-5470-47c1-918e-f8ca11e89754')
    THEN 'User HAS a profile - cannot delete via this method'
    ELSE 'User is orphaned - safe to delete'
  END as status;

-- Step 2: Check for any related data that might prevent deletion
-- Check enrollments
SELECT 
  'Checking enrollments...' as step,
  COUNT(*) as count
FROM public.enrollments 
WHERE student_id = '6680c6a7-5470-47c1-918e-f8ca11e89754';

-- Check course purchases
SELECT 
  'Checking book purchases...' as step,
  COUNT(*) as count
FROM public.book_purchases 
WHERE student_id = '6680c6a7-5470-47c1-918e-f8ca11e89754';

-- Check payments
SELECT 
  'Checking payments...' as step,
  COUNT(*) as count
FROM public.payments 
WHERE user_id = '6680c6a7-5470-47c1-918e-f8ca11e89754';

-- Check messages
SELECT 
  'Checking messages...' as step,
  COUNT(*) as count
FROM public.messages 
WHERE sender_id = '6680c6a7-5470-47c1-918e-f8ca11e89754' 
   OR receiver_id = '6680c6a7-5470-47c1-918e-f8ca11e89754';

-- Check forum posts
SELECT 
  'Checking forum posts...' as step,
  COUNT(*) as count
FROM public.forum_posts 
WHERE author_id = '6680c6a7-5470-47c1-918e-f8ca11e89754';

-- Check lesson progress
SELECT 
  'Checking lesson progress...' as step,
  COUNT(*) as count
FROM public.lesson_progress 
WHERE student_id = '6680c6a7-5470-47c1-918e-f8ca11e89754';

-- Check quiz attempts
SELECT 
  'Checking quiz attempts...' as step,
  COUNT(*) as count
FROM public.quiz_attempts 
WHERE student_id = '6680c6a7-5470-47c1-918e-f8ca11e89754';

-- Step 3: If user has related data, you may need to delete it first
-- (Only run these if the counts above are > 0)
-- 
-- DELETE FROM public.enrollments WHERE student_id = '6680c6a7-5470-47c1-918e-f8ca11e89754';
-- DELETE FROM public.book_purchases WHERE student_id = '6680c6a7-5470-47c1-918e-f8ca11e89754';
-- DELETE FROM public.payments WHERE user_id = '6680c6a7-5470-47c1-918e-f8ca11e89754';
-- DELETE FROM public.messages WHERE sender_id = '6680c6a7-5470-47c1-918e-f8ca11e89754' OR receiver_id = '6680c6a7-5470-47c1-918e-f8ca11e89754';
-- DELETE FROM public.forum_posts WHERE author_id = '6680c6a7-5470-47c1-918e-f8ca11e89754';
-- DELETE FROM public.lesson_progress WHERE student_id = '6680c6a7-5470-47c1-918e-f8ca11e89754';
-- DELETE FROM public.quiz_attempts WHERE student_id = '6680c6a7-5470-47c1-918e-f8ca11e89754';

-- Step 4: After cleaning up related data, try deleting via Supabase Admin API
-- Use the TypeScript script: npx tsx scripts/048_delete_orphaned_auth_user.ts 6680c6a7-5470-47c1-918e-f8ca11e89754




















