-- Fix enrollments RLS policy to allow proper enrollment checking
-- Drop the existing policy
DROP POLICY IF EXISTS "enrollments_select_own" ON public.enrollments;

-- Create a simpler, more permissive policy for enrollments
CREATE POLICY "enrollments_select_own" ON public.enrollments FOR SELECT USING (
  student_id = auth.uid() 
  OR 
  EXISTS (
    SELECT 1 FROM public.courses 
    WHERE courses.id = enrollments.course_id 
    AND courses.instructor_id = auth.uid()
  )
);

-- Also ensure we can insert enrollments properly
DROP POLICY IF EXISTS "enrollments_insert_student" ON public.enrollments;
CREATE POLICY "enrollments_insert_student" ON public.enrollments FOR INSERT WITH CHECK (
  student_id = auth.uid()
);

-- Allow updates to own enrollments
DROP POLICY IF EXISTS "enrollments_update_own" ON public.enrollments;
CREATE POLICY "enrollments_update_own" ON public.enrollments FOR UPDATE USING (
  student_id = auth.uid()
);


