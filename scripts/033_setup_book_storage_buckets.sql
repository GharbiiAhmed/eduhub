    -- Create storage buckets for books
    -- Note: Buckets need to be created manually in Supabase Dashboard
    -- This script only sets up the policies

    -- Policies for book-covers bucket
    -- Allow authenticated users to upload book covers
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES ('book-covers', 'book-covers', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'])
    ON CONFLICT (id) DO NOTHING;

    -- Allow public read access to book covers
    DROP POLICY IF EXISTS "Public read access for book covers" ON storage.objects;
    CREATE POLICY "Public read access for book covers"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'book-covers');

    -- Allow authenticated users to upload book covers
    DROP POLICY IF EXISTS "Authenticated users can upload book covers" ON storage.objects;
    CREATE POLICY "Authenticated users can upload book covers"
    ON storage.objects FOR INSERT
    WITH CHECK (
    bucket_id = 'book-covers' AND
    auth.role() = 'authenticated'
    );

    -- Allow authenticated users to update their own book covers
    DROP POLICY IF EXISTS "Users can update their own book covers" ON storage.objects;
    CREATE POLICY "Users can update their own book covers"
    ON storage.objects FOR UPDATE
    USING (
    bucket_id = 'book-covers' AND
    auth.role() = 'authenticated'
    );

    -- Allow authenticated users to delete their own book covers
    DROP POLICY IF EXISTS "Users can delete their own book covers" ON storage.objects;
    CREATE POLICY "Users can delete their own book covers"
    ON storage.objects FOR DELETE
    USING (
    bucket_id = 'book-covers' AND
    auth.role() = 'authenticated'
    );

    -- Policies for book-pdfs bucket
    -- Allow authenticated users to upload book PDFs
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES ('book-pdfs', 'book-pdfs', true, 104857600, ARRAY['application/pdf'])
    ON CONFLICT (id) DO NOTHING;

    -- Allow public read access to book PDFs
    DROP POLICY IF EXISTS "Public read access for book PDFs" ON storage.objects;
    CREATE POLICY "Public read access for book PDFs"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'book-pdfs');

    -- Allow authenticated users to upload book PDFs
    DROP POLICY IF EXISTS "Authenticated users can upload book PDFs" ON storage.objects;
    CREATE POLICY "Authenticated users can upload book PDFs"
    ON storage.objects FOR INSERT
    WITH CHECK (
    bucket_id = 'book-pdfs' AND
    auth.role() = 'authenticated'
    );

    -- Allow authenticated users to update their own book PDFs
    DROP POLICY IF EXISTS "Users can update their own book PDFs" ON storage.objects;
    CREATE POLICY "Users can update their own book PDFs"
    ON storage.objects FOR UPDATE
    USING (
    bucket_id = 'book-pdfs' AND
    auth.role() = 'authenticated'
    );

    -- Allow authenticated users to delete their own book PDFs
    DROP POLICY IF EXISTS "Users can delete their own book PDFs" ON storage.objects;
    CREATE POLICY "Users can delete their own book PDFs"
    ON storage.objects FOR DELETE
    USING (
    bucket_id = 'book-pdfs' AND
    auth.role() = 'authenticated'
    );

