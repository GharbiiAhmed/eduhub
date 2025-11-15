-- Fix RLS policy for forum_posts to allow enrolled students to view posts
-- Drop the existing policy
DROP POLICY IF EXISTS "forum_posts_select" ON public.forum_posts;

-- Create new policy that allows enrolled students to see posts
CREATE POLICY "forum_posts_select" ON public.forum_posts FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.forums 
    JOIN public.courses ON courses.id = forums.course_id 
    WHERE forums.id = forum_posts.forum_id 
    AND (
      courses.status = 'published' 
      OR 
      courses.instructor_id = auth.uid()
      OR
      EXISTS (
        SELECT 1 FROM public.enrollments 
        WHERE enrollments.course_id = forums.course_id 
        AND enrollments.student_id = auth.uid()
      )
    )
  )
);

