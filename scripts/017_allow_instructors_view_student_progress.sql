-- Allow instructors to view lesson progress for students in their courses
CREATE POLICY "lesson_progress_select_instructor" ON public.lesson_progress 
FOR SELECT 
USING (
  -- Allow if student owns the progress
  student_id = auth.uid()
  OR
  -- Allow if instructor teaches the course
  EXISTS (
    SELECT 1 FROM public.lessons
    JOIN public.modules ON modules.id = lessons.module_id
    JOIN public.courses ON courses.id = modules.course_id
    WHERE lessons.id = lesson_progress.lesson_id
    AND courses.instructor_id = auth.uid()
  )
);

