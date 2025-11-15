-- Verify that rating columns exist and check current values
-- This script helps diagnose rating display issues

-- Check if columns exist in courses table
SELECT 
  column_name, 
  data_type, 
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'courses' 
  AND column_name IN ('average_rating', 'total_ratings');

-- Check if columns exist in profiles table
SELECT 
  column_name, 
  data_type, 
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'profiles' 
  AND column_name IN ('average_rating', 'total_ratings');

-- Check if course_ratings table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
    AND table_name = 'course_ratings'
);

-- Show current rating values for all courses
SELECT 
  id,
  title,
  average_rating,
  total_ratings,
  CASE 
    WHEN average_rating IS NULL THEN 'NULL'
    WHEN average_rating = 0 THEN '0 (no ratings)'
    ELSE average_rating::text
  END as rating_status
FROM public.courses
ORDER BY created_at DESC
LIMIT 10;

-- Show actual ratings in course_ratings table
SELECT 
  course_id,
  COUNT(*) as rating_count,
  AVG(rating)::DECIMAL(3,2) as avg_rating
FROM public.course_ratings
GROUP BY course_id
ORDER BY rating_count DESC
LIMIT 10;


