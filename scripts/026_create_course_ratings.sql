-- Create course ratings table
CREATE TABLE IF NOT EXISTS public.course_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, course_id)
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_course_ratings_course_id ON public.course_ratings(course_id);
CREATE INDEX IF NOT EXISTS idx_course_ratings_student_id ON public.course_ratings(student_id);
CREATE INDEX IF NOT EXISTS idx_course_ratings_rating ON public.course_ratings(rating);

-- Add rating columns to courses table for caching
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_ratings INTEGER DEFAULT 0;

-- Add rating column to profiles table for instructor ratings
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_ratings INTEGER DEFAULT 0;

-- Create function to update course average rating
CREATE OR REPLACE FUNCTION update_course_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.courses
  SET 
    average_rating = (
      SELECT COALESCE(AVG(rating)::DECIMAL(3, 2), 0)
      FROM public.course_ratings
      WHERE course_id = NEW.course_id
    ),
    total_ratings = (
      SELECT COUNT(*)
      FROM public.course_ratings
      WHERE course_id = NEW.course_id
    )
  WHERE id = NEW.course_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_update_course_rating ON public.course_ratings;
DROP TRIGGER IF EXISTS trigger_update_course_rating_delete ON public.course_ratings;

-- Create trigger to update course rating when rating is inserted/updated
CREATE TRIGGER trigger_update_course_rating
AFTER INSERT OR UPDATE ON public.course_ratings
FOR EACH ROW
EXECUTE FUNCTION update_course_rating();

-- Create trigger to update course rating when rating is deleted
CREATE TRIGGER trigger_update_course_rating_delete
AFTER DELETE ON public.course_ratings
FOR EACH ROW
EXECUTE FUNCTION update_course_rating();

-- Create function to update instructor rating based on their courses
CREATE OR REPLACE FUNCTION update_instructor_rating()
RETURNS TRIGGER AS $$
DECLARE
  instructor_id_val UUID;
  course_id_val UUID;
BEGIN
  -- Determine which course_id to use
  IF TG_OP = 'DELETE' THEN
    course_id_val := OLD.course_id;
  ELSE
    course_id_val := NEW.course_id;
  END IF;
  
  -- Get the instructor_id from the course
  SELECT instructor_id INTO instructor_id_val
  FROM public.courses
  WHERE id = course_id_val;
  
  IF instructor_id_val IS NOT NULL THEN
    -- Update instructor rating based on all their courses
    UPDATE public.profiles
    SET 
      average_rating = (
        SELECT COALESCE(AVG(c.average_rating), 0)
        FROM public.courses c
        WHERE c.instructor_id = instructor_id_val
        AND c.total_ratings > 0
      ),
      total_ratings = (
        SELECT COALESCE(SUM(c.total_ratings), 0)
        FROM public.courses c
        WHERE c.instructor_id = instructor_id_val
      )
    WHERE id = instructor_id_val;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_instructor_rating ON public.course_ratings;

-- Create trigger to update instructor rating when course rating changes
CREATE TRIGGER trigger_update_instructor_rating
AFTER INSERT OR UPDATE OR DELETE ON public.course_ratings
FOR EACH ROW
EXECUTE FUNCTION update_instructor_rating();

