-- Fix ratings issue - comprehensive update script
-- This script will:
-- 1. Check current state
-- 2. Update all course ratings from course_ratings table
-- 3. Update instructor ratings
-- 4. Verify the updates

-- First, let's see what we have
SELECT 'Current course_ratings:' as info;
SELECT 
  course_id,
  COUNT(*) as rating_count,
  AVG(rating)::DECIMAL(3,2) as avg_rating,
  MIN(rating) as min_rating,
  MAX(rating) as max_rating
FROM public.course_ratings
GROUP BY course_id;

-- Now update courses table with actual ratings
UPDATE public.courses
SET 
  average_rating = COALESCE((
    SELECT AVG(rating)::DECIMAL(3, 2)
    FROM public.course_ratings
    WHERE course_ratings.course_id = courses.id
  ), 0),
  total_ratings = COALESCE((
    SELECT COUNT(*)
    FROM public.course_ratings
    WHERE course_ratings.course_id = courses.id
  ), 0);

-- Set courses with no ratings to NULL (so they show as N/A)
UPDATE public.courses
SET 
  average_rating = NULL,
  total_ratings = 0
WHERE NOT EXISTS (
  SELECT 1 
  FROM public.course_ratings 
  WHERE course_ratings.course_id = courses.id
);

-- Update instructor ratings based on their courses
UPDATE public.profiles
SET 
  average_rating = COALESCE((
    SELECT AVG(c.average_rating)
    FROM public.courses c
    WHERE c.instructor_id = profiles.id
    AND c.total_ratings > 0
    AND c.average_rating IS NOT NULL
  ), NULL),
  total_ratings = COALESCE((
    SELECT SUM(c.total_ratings)
    FROM public.courses c
    WHERE c.instructor_id = profiles.id
  ), 0)
WHERE EXISTS (
  SELECT 1 
  FROM public.courses 
  WHERE courses.instructor_id = profiles.id
);

-- Verify the updates
SELECT 'Updated courses with ratings:' as info;
SELECT 
  c.id,
  c.title,
  c.average_rating,
  c.total_ratings,
  COUNT(cr.id) as actual_rating_count,
  AVG(cr.rating)::DECIMAL(3,2) as actual_avg_rating,
  CASE 
    WHEN c.average_rating IS NULL THEN 'NULL (no ratings)'
    WHEN c.average_rating = 0 THEN '0 (should be NULL)'
    ELSE c.average_rating::text
  END as status
FROM public.courses c
LEFT JOIN public.course_ratings cr ON cr.course_id = c.id
GROUP BY c.id, c.title, c.average_rating, c.total_ratings
HAVING COUNT(cr.id) > 0
ORDER BY c.created_at DESC;

-- Show all courses and their rating status
SELECT 'All courses rating status:' as info;
SELECT 
  id,
  title,
  average_rating,
  total_ratings,
  CASE 
    WHEN average_rating IS NULL THEN 'No ratings'
    WHEN average_rating = 0 AND total_ratings = 0 THEN 'No ratings (0)'
    ELSE 'Has ratings'
  END as rating_status
FROM public.courses
ORDER BY created_at DESC
LIMIT 20;


