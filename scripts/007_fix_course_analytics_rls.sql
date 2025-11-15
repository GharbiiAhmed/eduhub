-- Fix course_analytics RLS policies to allow enrollment triggers to work
-- The issue is that when students enroll, a trigger tries to insert/update course_analytics
-- but students don't have INSERT/UPDATE permissions on this table

-- Option 1: Create a simpler policy that allows the trigger to work
-- Drop existing policies
DROP POLICY IF EXISTS "Instructors can view their course analytics" ON public.course_analytics;
DROP POLICY IF EXISTS "Admins can view all analytics" ON public.course_analytics;

-- Create a more permissive policy for course_analytics
-- This allows the trigger to work while still maintaining some security
CREATE POLICY "course_analytics_select" ON public.course_analytics FOR SELECT USING (
  -- Instructors can view their course analytics
  EXISTS (
    SELECT 1 FROM public.courses 
    WHERE public.courses.id = public.course_analytics.course_id 
      AND public.courses.instructor_id = auth.uid()
  )
  OR
  -- Admins can view all analytics
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE public.profiles.id = auth.uid() 
      AND public.profiles.role = 'admin'
  )
);

-- Allow INSERT for course_analytics (needed for triggers)
CREATE POLICY "course_analytics_insert" ON public.course_analytics FOR INSERT WITH CHECK (true);

-- Allow UPDATE for course_analytics (needed for triggers)
CREATE POLICY "course_analytics_update" ON public.course_analytics FOR UPDATE USING (true);

-- Alternative: If you want more security, you can disable RLS on course_analytics entirely
-- since it's an internal analytics table that doesn't contain sensitive user data
-- ALTER TABLE public.course_analytics DISABLE ROW LEVEL SECURITY;