-- Storage Bucket RLS Policies Setup
-- This script sets up Row Level Security policies for all storage buckets used in the application

-- ============================================
-- COURSE THUMBNAILS BUCKET POLICIES
-- ============================================

-- Allow authenticated users to upload course thumbnails
CREATE POLICY "Allow authenticated uploads to course-thumbnails" 
ON storage.objects
FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'course-thumbnails');

-- Allow public read access to course thumbnails
CREATE POLICY "Allow public read course-thumbnails" 
ON storage.objects
FOR SELECT 
TO public
USING (bucket_id = 'course-thumbnails');

-- Allow authenticated users to update their own uploads
CREATE POLICY "Allow authenticated update course-thumbnails" 
ON storage.objects
FOR UPDATE 
TO authenticated
USING (bucket_id = 'course-thumbnails')
WITH CHECK (bucket_id = 'course-thumbnails');

-- Allow authenticated users to delete their own uploads
CREATE POLICY "Allow authenticated delete course-thumbnails" 
ON storage.objects
FOR DELETE 
TO authenticated
USING (bucket_id = 'course-thumbnails');

-- ============================================
-- LESSON VIDEOS BUCKET POLICIES
-- ============================================

-- Allow authenticated users to upload lesson videos
CREATE POLICY "Allow authenticated uploads to lesson-videos" 
ON storage.objects
FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'lesson-videos');

-- Allow public read access to lesson videos
CREATE POLICY "Allow public read lesson-videos" 
ON storage.objects
FOR SELECT 
TO public
USING (bucket_id = 'lesson-videos');

-- Allow authenticated users to update their own uploads
CREATE POLICY "Allow authenticated update lesson-videos" 
ON storage.objects
FOR UPDATE 
TO authenticated
USING (bucket_id = 'lesson-videos')
WITH CHECK (bucket_id = 'lesson-videos');

-- Allow authenticated users to delete their own uploads
CREATE POLICY "Allow authenticated delete lesson-videos" 
ON storage.objects
FOR DELETE 
TO authenticated
USING (bucket_id = 'lesson-videos');

-- ============================================
-- LESSON PDFS BUCKET POLICIES
-- ============================================

-- Allow authenticated users to upload lesson PDFs
CREATE POLICY "Allow authenticated uploads to lesson-pdfs" 
ON storage.objects
FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'lesson-pdfs');

-- Allow public read access to lesson PDFs
CREATE POLICY "Allow public read lesson-pdfs" 
ON storage.objects
FOR SELECT 
TO public
USING (bucket_id = 'lesson-pdfs');

-- Allow authenticated users to update their own uploads
CREATE POLICY "Allow authenticated update lesson-pdfs" 
ON storage.objects
FOR UPDATE 
TO authenticated
USING (bucket_id = 'lesson-pdfs')
WITH CHECK (bucket_id = 'lesson-pdfs');

-- Allow authenticated users to delete their own uploads
CREATE POLICY "Allow authenticated delete lesson-pdfs" 
ON storage.objects
FOR DELETE 
TO authenticated
USING (bucket_id = 'lesson-pdfs');

-- ============================================
-- LESSON IMAGES BUCKET POLICIES
-- ============================================

-- Allow authenticated users to upload lesson images
CREATE POLICY "Allow authenticated uploads to lesson-images" 
ON storage.objects
FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'lesson-images');

-- Allow public read access to lesson images
CREATE POLICY "Allow public read lesson-images" 
ON storage.objects
FOR SELECT 
TO public
USING (bucket_id = 'lesson-images');

-- Allow authenticated users to update their own uploads
CREATE POLICY "Allow authenticated update lesson-images" 
ON storage.objects
FOR UPDATE 
TO authenticated
USING (bucket_id = 'lesson-images')
WITH CHECK (bucket_id = 'lesson-images');

-- Allow authenticated users to delete their own uploads
CREATE POLICY "Allow authenticated delete lesson-images" 
ON storage.objects
FOR DELETE 
TO authenticated
USING (bucket_id = 'lesson-images');


