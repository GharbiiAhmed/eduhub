-- Create forum post likes table
CREATE TABLE IF NOT EXISTS public.forum_post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(post_id, user_id)
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_forum_post_likes_post_id ON public.forum_post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_forum_post_likes_user_id ON public.forum_post_likes(user_id);

-- Enable RLS
ALTER TABLE public.forum_post_likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for forum_post_likes
-- SELECT: Users can see likes for posts they have access to
CREATE POLICY "forum_post_likes_select" ON public.forum_post_likes FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.forum_posts
    JOIN public.forums ON forums.id = forum_posts.forum_id
    JOIN public.courses ON courses.id = forums.course_id
    WHERE forum_posts.id = forum_post_likes.post_id
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

-- INSERT: Users can like posts in forums they have access to
CREATE POLICY "forum_post_likes_insert" ON public.forum_post_likes FOR INSERT WITH CHECK (
  user_id = auth.uid()
  AND
  EXISTS (
    SELECT 1 FROM public.forum_posts
    JOIN public.forums ON forums.id = forum_posts.forum_id
    JOIN public.courses ON courses.id = forums.course_id
    WHERE forum_posts.id = forum_post_likes.post_id
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

-- DELETE: Users can unlike their own likes
CREATE POLICY "forum_post_likes_delete_own" ON public.forum_post_likes FOR DELETE USING (user_id = auth.uid());

