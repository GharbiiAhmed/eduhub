-- Add RLS policies for forum_replies table
-- These policies allow students enrolled in courses to view and create replies

-- Forum Replies SELECT policy: Students can see replies for posts in forums they have access to
CREATE POLICY "forum_replies_select" ON public.forum_replies FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.forum_posts
    JOIN public.forums ON forums.id = forum_posts.forum_id
    JOIN public.courses ON courses.id = forums.course_id
    WHERE forum_posts.id = forum_replies.post_id
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

-- Forum Replies INSERT policy: Students enrolled in published courses can create replies
CREATE POLICY "forum_replies_insert" ON public.forum_replies FOR INSERT WITH CHECK (
  author_id = auth.uid()
  AND
  EXISTS (
    SELECT 1 FROM public.forum_posts
    JOIN public.forums ON forums.id = forum_posts.forum_id
    JOIN public.courses ON courses.id = forums.course_id
    WHERE forum_posts.id = forum_replies.post_id
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

-- Forum Replies UPDATE policy: Only the author can update their own replies
CREATE POLICY "forum_replies_update_own" ON public.forum_replies FOR UPDATE USING (author_id = auth.uid());

-- Forum Replies DELETE policy: Only the author can delete their own replies
CREATE POLICY "forum_replies_delete_own" ON public.forum_replies FOR DELETE USING (author_id = auth.uid());

