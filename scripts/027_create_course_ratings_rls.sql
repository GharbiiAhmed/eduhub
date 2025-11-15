-- RLS Policies for Course Ratings

-- Enable RLS on course_ratings table
ALTER TABLE public.course_ratings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view course ratings" ON public.course_ratings;
DROP POLICY IF EXISTS "Students can rate completed courses" ON public.course_ratings;
DROP POLICY IF EXISTS "Students can update their own ratings" ON public.course_ratings;
DROP POLICY IF EXISTS "Students can delete their own ratings" ON public.course_ratings;
DROP POLICY IF EXISTS "Instructors can view ratings for their courses" ON public.course_ratings;

-- Allow students to view all ratings
CREATE POLICY "Anyone can view course ratings" 
ON public.course_ratings
FOR SELECT 
TO public
USING (true);

-- Allow authenticated students to insert their own ratings
-- Only if they have completed the course (100% progress)
CREATE POLICY "Students can rate completed courses" 
ON public.course_ratings
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() = student_id
  AND EXISTS (
    SELECT 1 
    FROM public.enrollments 
    WHERE student_id = auth.uid() 
    AND course_id = course_ratings.course_id
    AND progress_percentage = 100
  )
);

-- Allow students to update their own ratings
CREATE POLICY "Students can update their own ratings" 
ON public.course_ratings
FOR UPDATE 
TO authenticated
USING (auth.uid() = student_id)
WITH CHECK (auth.uid() = student_id);

-- Allow students to delete their own ratings
CREATE POLICY "Students can delete their own ratings" 
ON public.course_ratings
FOR DELETE 
TO authenticated
USING (auth.uid() = student_id);

-- Allow instructors to view ratings for their courses
CREATE POLICY "Instructors can view ratings for their courses" 
ON public.course_ratings
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.courses 
    WHERE courses.id = course_ratings.course_id 
    AND courses.instructor_id = auth.uid()
  )
);

