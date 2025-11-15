-- Fix RLS policy for forum_posts INSERT to allow instructors to create posts
-- Drop the existing policy
DROP POLICY IF EXISTS "forum_posts_insert" ON public.forum_posts;

-- Create new policy that allows enrolled students AND instructors to create posts
CREATE POLICY "forum_posts_insert" ON public.forum_posts FOR INSERT WITH CHECK (
  author_id = auth.uid()
  AND
  EXISTS (
    SELECT 1 FROM public.forums 
    JOIN public.courses ON courses.id = forums.course_id 
    WHERE forums.id = forum_posts.forum_id 
    AND courses.status = 'published'
    AND (
      EXISTS (
        SELECT 1 FROM public.enrollments 
        WHERE enrollments.course_id = forums.course_id 
        AND enrollments.student_id = auth.uid()
      )
      OR
      courses.instructor_id = auth.uid()
    )
  )
);

