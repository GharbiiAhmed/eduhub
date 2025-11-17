-- Add user approval status (pending, approved) to profiles table
-- This allows admins to approve new user registrations before they can access the system

-- Drop the existing check constraint
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_status_check;

-- Add new check constraint with pending and approved statuses
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_status_check 
CHECK (status IN ('pending', 'approved', 'active', 'inactive', 'banned'));

-- Set all existing users to 'approved' (they were already active)
UPDATE public.profiles
SET status = 'approved'
WHERE status = 'active';

-- Update the trigger to set new users to 'pending' status
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, status)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data ->> 'role', 'student'),
    'pending'  -- New users start as pending approval
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

