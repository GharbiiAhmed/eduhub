-- Add subscription support to courses and books
-- This script adds subscription fields and creates subscriptions table

-- Add subscription fields to courses table
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS subscription_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS monthly_price DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS yearly_price DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS subscription_type TEXT DEFAULT 'one_time' CHECK (subscription_type IN ('one_time', 'subscription', 'both'));

-- Add subscription fields to books table
ALTER TABLE public.books
ADD COLUMN IF NOT EXISTS subscription_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS monthly_price DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS yearly_price DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS subscription_type TEXT DEFAULT 'one_time' CHECK (subscription_type IN ('one_time', 'subscription', 'both'));

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  book_id UUID REFERENCES public.books(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT NOT NULL,
  stripe_price_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'past_due', 'unpaid', 'trialing', 'incomplete', 'incomplete_expired', 'paused')),
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_course_id ON public.subscriptions(course_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_book_id ON public.subscriptions(book_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON public.subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_current_period_end ON public.subscriptions(current_period_end);

-- Enable RLS on subscriptions table
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscriptions
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

-- System can insert/update subscriptions (via service role)
-- Note: This will be handled by API routes using service role client

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at
DROP TRIGGER IF EXISTS trigger_update_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER trigger_update_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_subscriptions_updated_at();


