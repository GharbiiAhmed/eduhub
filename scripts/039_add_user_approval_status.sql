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

-- Update the trigger to set new users status based on role
-- Students are auto-approved, Instructors need admin approval
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
  user_status TEXT;
BEGIN
  user_role := COALESCE(new.raw_user_meta_data ->> 'role', 'student');
  
  -- Students are auto-approved, Instructors need approval
  IF user_role = 'instructor' THEN
    user_status := 'pending';
  ELSE
    user_status := 'approved';
  END IF;
  
  INSERT INTO public.profiles (id, email, role, status)
  VALUES (
    new.id,
    new.email,
    user_role,
    user_status
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

