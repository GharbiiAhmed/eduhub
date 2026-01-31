-- Create storage bucket for assignment file submissions
-- Run this in Supabase SQL Editor so file uploads work on the student assignment page

-- Create assignments bucket (10MB per file, common document types)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'assignments',
  'assignments',
  true,
  10485760,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/zip',
    'application/x-rar-compressed',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Allow authenticated users (students) to upload to assignments bucket
DROP POLICY IF EXISTS "Authenticated users can upload assignment files" ON storage.objects;
CREATE POLICY "Authenticated users can upload assignment files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'assignments');

-- Allow public read so instructors and students can open submitted file links
DROP POLICY IF EXISTS "Public read access for assignment files" ON storage.objects;
CREATE POLICY "Public read access for assignment files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'assignments');

-- Allow authenticated users to update their own uploads (resubmit)
DROP POLICY IF EXISTS "Authenticated users can update assignment files" ON storage.objects;
CREATE POLICY "Authenticated users can update assignment files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'assignments')
WITH CHECK (bucket_id = 'assignments');

-- Allow authenticated users to delete (optional, for cleanup)
DROP POLICY IF EXISTS "Authenticated users can delete assignment files" ON storage.objects;
CREATE POLICY "Authenticated users can delete assignment files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'assignments');
