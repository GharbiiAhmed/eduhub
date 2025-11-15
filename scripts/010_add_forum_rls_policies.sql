-- Add RLS policies for forums table
-- These policies allow students enrolled in published courses to view and create forums

-- Forums SELECT policy: Students can see forums for courses they're enrolled in or that are published
CREATE POLICY "forums_select_enrolled_or_published" ON public.forums FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.courses 
    WHERE courses.id = forums.course_id 
    AND (
      courses.status = 'published' 
      OR 
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

-- Forums INSERT policy: Students enrolled in published courses can create forums
CREATE POLICY "forums_insert_enrolled" ON public.forums FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.courses 
    WHERE courses.id = forums.course_id 
    AND courses.status = 'published'
    AND EXISTS (
      SELECT 1 FROM public.enrollments 
      WHERE enrollments.course_id = forums.course_id 
      AND enrollments.student_id = auth.uid()
    )
  )
  OR
  EXISTS (
    SELECT 1 FROM public.courses 
    WHERE courses.id = forums.course_id 
    AND courses.instructor_id = auth.uid()
  )
);

-- Forums UPDATE policy: Only instructors of the course can update forums
CREATE POLICY "forums_update_instructor" ON public.forums FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.courses 
    WHERE courses.id = forums.course_id 
    AND courses.instructor_id = auth.uid()
  )
);

-- Forums DELETE policy: Only instructors of the course can delete forums
CREATE POLICY "forums_delete_instructor" ON public.forums FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.courses 
    WHERE courses.id = forums.course_id 
    AND courses.instructor_id = auth.uid()
  )
);

