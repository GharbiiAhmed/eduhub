-- Additional RLS policies for subscriptions
-- This ensures proper access control for subscription management

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Instructors can view subscriptions for their content" ON public.subscriptions;
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.subscriptions;

-- Users can view their own subscriptions
CREATE POLICY "Users can view their own subscriptions" 
ON public.subscriptions
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Instructors can view subscriptions for their courses/books
CREATE POLICY "Instructors can view subscriptions for their content" 
ON public.subscriptions
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.courses 
    WHERE courses.id = subscriptions.course_id 
    AND courses.instructor_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.books 
    WHERE books.id = subscriptions.book_id 
    AND books.instructor_id = auth.uid()
  )
);

-- Admins can view all subscriptions
CREATE POLICY "Admins can view all subscriptions" 
ON public.subscriptions
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);


