-- Add status column to profiles table
-- This allows admins to manage user status (active, inactive, banned)

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'banned'));

-- Update existing profiles to have 'active' status if they don't have one
UPDATE public.profiles
SET status = 'active'
WHERE status IS NULL;

-- Make status NOT NULL after setting defaults
ALTER TABLE public.profiles
ALTER COLUMN status SET NOT NULL;

-- Add index for status queries
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);

