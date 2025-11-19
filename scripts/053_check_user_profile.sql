-- Check if a user has a profile
-- Replace USER_ID with the actual user ID

-- Check specific user: 49fa1e0a-92c0-437f-bd80-e6a71152856c
SELECT 
  'User Profile Check' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM public.profiles WHERE id = '49fa1e0a-92c0-437f-bd80-e6a71152856c')
    THEN 'Profile EXISTS'
    ELSE 'Profile MISSING'
  END as status,
  (SELECT email FROM auth.users WHERE id = '49fa1e0a-92c0-437f-bd80-e6a71152856c') as user_email;

-- Get profile details if it exists
SELECT 
  id,
  email,
  full_name,
  role,
  status,
  created_at
FROM public.profiles
WHERE id = '49fa1e0a-92c0-437f-bd80-e6a71152856c';

-- Check auth user details
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  last_sign_in_at
FROM auth.users
WHERE id = '49fa1e0a-92c0-437f-bd80-e6a71152856c';

