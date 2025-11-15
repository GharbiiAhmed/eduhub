-- Add image_url column to lessons table if it doesn't exist
ALTER TABLE public.lessons
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add comment to document the column
COMMENT ON COLUMN public.lessons.image_url IS 'URL to an image file for the lesson content';

