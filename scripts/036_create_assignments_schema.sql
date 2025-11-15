-- Create assignments table
CREATE TABLE IF NOT EXISTS public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  module_id UUID REFERENCES public.modules(id) ON DELETE SET NULL,
  instructor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  instructions TEXT,
  due_date TIMESTAMP WITH TIME ZONE,
  max_points INTEGER DEFAULT 100,
  assignment_type TEXT DEFAULT 'essay' CHECK (assignment_type IN ('essay', 'project', 'file_upload', 'text')),
  allowed_file_types TEXT[], -- e.g., ['pdf', 'doc', 'docx']
  max_file_size_mb INTEGER DEFAULT 10,
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create assignment submissions table
CREATE TABLE IF NOT EXISTS public.assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  submission_text TEXT,
  file_url TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'graded', 'returned')),
  score INTEGER,
  feedback TEXT,
  graded_at TIMESTAMP WITH TIME ZONE,
  graded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(assignment_id, student_id)
);

-- Enable RLS
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for assignments
CREATE POLICY "Instructors can view their own course assignments" ON public.assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE courses.id = assignments.course_id 
      AND courses.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Students can view published assignments for enrolled courses" ON public.assignments
  FOR SELECT USING (
    is_published = TRUE AND
    EXISTS (
      SELECT 1 FROM public.enrollments
      WHERE enrollments.course_id = assignments.course_id
      AND enrollments.student_id = auth.uid()
    )
  );

CREATE POLICY "Instructors can manage their own course assignments" ON public.assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE courses.id = assignments.course_id 
      AND courses.instructor_id = auth.uid()
    )
  );

-- RLS Policies for assignment_submissions
CREATE POLICY "Students can view their own submissions" ON public.assignment_submissions
  FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Instructors can view submissions for their course assignments" ON public.assignment_submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.assignments
      JOIN public.courses ON courses.id = assignments.course_id
      WHERE assignments.id = assignment_submissions.assignment_id
      AND courses.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Students can create their own submissions" ON public.assignment_submissions
  FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update their own submissions before grading" ON public.assignment_submissions
  FOR UPDATE USING (
    auth.uid() = student_id AND
    status = 'submitted'
  );

CREATE POLICY "Instructors can grade submissions for their course assignments" ON public.assignment_submissions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.assignments
      JOIN public.courses ON courses.id = assignments.course_id
      WHERE assignments.id = assignment_submissions.assignment_id
      AND courses.instructor_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_assignments_course_id ON public.assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_assignments_instructor_id ON public.assignments(instructor_id);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON public.assignments(due_date);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment_id ON public.assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student_id ON public.assignment_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_status ON public.assignment_submissions(status);

-- Add updated_at trigger
CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON public.assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


















