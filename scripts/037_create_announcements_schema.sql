-- Create announcements table
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  target_audience TEXT DEFAULT 'all' CHECK (target_audience IN ('all', 'students', 'instructors', 'admins', 'course_students')),
  is_published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create announcement views table (to track who has seen announcements)
CREATE TABLE IF NOT EXISTS public.announcement_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(announcement_id, user_id)
);

-- Enable RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies for announcements
CREATE POLICY "All authenticated users can view published announcements" ON public.announcements
  FOR SELECT USING (
    is_published = TRUE AND
    (expires_at IS NULL OR expires_at > NOW()) AND
    (
      target_audience = 'all' OR
      (target_audience = 'students' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'student')) OR
      (target_audience = 'instructors' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'instructor')) OR
      (target_audience = 'admins' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')) OR
      (target_audience = 'course_students' AND EXISTS (
        SELECT 1 FROM public.enrollments
        WHERE enrollments.course_id = announcements.course_id
        AND enrollments.student_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Admins can manage all announcements" ON public.announcements
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Instructors can manage announcements for their courses" ON public.announcements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = announcements.course_id
      AND courses.instructor_id = auth.uid()
    )
  );

-- RLS Policies for announcement_views
CREATE POLICY "Users can view their own announcement views" ON public.announcement_views
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own announcement views" ON public.announcement_views
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_announcements_author_id ON public.announcements(author_id);
CREATE INDEX IF NOT EXISTS idx_announcements_course_id ON public.announcements(course_id);
CREATE INDEX IF NOT EXISTS idx_announcements_published ON public.announcements(is_published, published_at);
CREATE INDEX IF NOT EXISTS idx_announcements_expires_at ON public.announcements(expires_at);
CREATE INDEX IF NOT EXISTS idx_announcement_views_announcement_id ON public.announcement_views(announcement_id);
CREATE INDEX IF NOT EXISTS idx_announcement_views_user_id ON public.announcement_views(user_id);

-- Add updated_at trigger
CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

















