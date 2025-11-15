-- ensure pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add AI chat history table
CREATE TABLE IF NOT EXISTS public.ai_chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('student', 'instructor', 'admin')),
  messages JSONB NOT NULL DEFAULT '[]',
  context VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add created_at columns if missing
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.enrollments
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Course analytics table
CREATE TABLE IF NOT EXISTS public.course_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  total_enrollments INTEGER DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0,
  completion_rate DECIMAL(5,2) DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_chat_history_user_id ON public.ai_chat_history(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_history_user_type ON public.ai_chat_history(user_type);
CREATE INDEX IF NOT EXISTS idx_ai_chat_history_created_at ON public.ai_chat_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_course_analytics_course_id ON public.course_analytics(course_id);

CREATE INDEX IF NOT EXISTS idx_enrollments_student_course ON public.enrollments(student_id, course_id);
CREATE INDEX IF NOT EXISTS idx_courses_instructor_status ON public.courses(instructor_id, status);
CREATE INDEX IF NOT EXISTS idx_courses_price ON public.courses(price);

-- RLS
ALTER TABLE public.ai_chat_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own chat history" ON public.ai_chat_history
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own chat history" ON public.ai_chat_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own chat history" ON public.ai_chat_history
  FOR UPDATE USING (auth.uid() = user_id);

ALTER TABLE public.course_analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Instructors can view their course analytics" ON public.course_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE public.courses.id = public.course_analytics.course_id 
        AND public.courses.instructor_id = auth.uid()
    )
  );
CREATE POLICY "Admins can view all analytics" ON public.course_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE public.profiles.id = auth.uid() 
        AND public.profiles.role = 'admin'
    )
  );

-- Trigger + function
CREATE OR REPLACE FUNCTION public.update_course_analytics()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.course_analytics
     SET total_enrollments = (SELECT COUNT(*) FROM public.enrollments WHERE course_id = NEW.course_id),
         last_updated = now()
   WHERE course_id = NEW.course_id;

  IF NOT FOUND THEN
    INSERT INTO public.course_analytics (course_id, total_enrollments)
    VALUES (NEW.course_id, 1);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_course_analytics ON public.enrollments;
CREATE TRIGGER trigger_update_course_analytics
AFTER INSERT ON public.enrollments
FOR EACH ROW EXECUTE FUNCTION public.update_course_analytics();

-- Optional stats refresh that *is* allowed in a transaction:
ANALYZE;
