-- Update existing course ratings from course_ratings table
-- This script recalculates and updates average_rating and total_ratings for all courses

-- Update course ratings based on actual ratings in course_ratings table
UPDATE public.courses
SET 
  average_rating = (
    SELECT COALESCE(AVG(rating)::DECIMAL(3, 2), 0)
    FROM public.course_ratings
    WHERE course_ratings.course_id = courses.id
  ),
  total_ratings = (
    SELECT COUNT(*)
    FROM public.course_ratings
    WHERE course_ratings.course_id = courses.id
  )
WHERE EXISTS (
  SELECT 1 
  FROM public.course_ratings 
  WHERE course_ratings.course_id = courses.id
);

-- Also update courses with no ratings to ensure they're set to 0
UPDATE public.courses
SET 
  average_rating = 0,
  total_ratings = 0
WHERE NOT EXISTS (
  SELECT 1 
  FROM public.course_ratings 
  WHERE course_ratings.course_id = courses.id
);

-- Update instructor ratings based on their courses
UPDATE public.profiles
SET 
  average_rating = (
    SELECT COALESCE(AVG(c.average_rating), 0)
    FROM public.courses c
    WHERE c.instructor_id = profiles.id
    AND c.total_ratings > 0
  ),
  total_ratings = (
    SELECT COALESCE(SUM(c.total_ratings), 0)
    FROM public.courses c
    WHERE c.instructor_id = profiles.id
  )
WHERE EXISTS (
  SELECT 1 
  FROM public.courses 
  WHERE courses.instructor_id = profiles.id
);

-- Show updated ratings
SELECT 
  c.id,
  c.title,
  c.average_rating,
  c.total_ratings,
  COUNT(cr.id) as actual_rating_count,
  AVG(cr.rating)::DECIMAL(3,2) as actual_avg_rating
FROM public.courses c
LEFT JOIN public.course_ratings cr ON cr.course_id = c.id
GROUP BY c.id, c.title, c.average_rating, c.total_ratings
HAVING COUNT(cr.id) > 0
ORDER BY c.created_at DESC
LIMIT 10;


