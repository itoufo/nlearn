-- =====================================================
-- NLearn Platform - Storage Buckets
-- =====================================================
-- Supabase Storage Configuration
-- Created: 2026-01-06
-- Naming: nlearn_ prefix
-- =====================================================

-- =====================================================
-- STORAGE BUCKETS
-- =====================================================

-- Avatar images (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'nlearn_avatars',
    'nlearn_avatars',
    true,
    5242880,  -- 5MB
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Course thumbnails (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'nlearn_thumbnails',
    'nlearn_thumbnails',
    true,
    10485760,  -- 10MB
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Certificates (private - generated PDFs)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'nlearn_certificates',
    'nlearn_certificates',
    false,
    10485760,  -- 10MB
    ARRAY['application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- General attachments (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'nlearn_attachments',
    'nlearn_attachments',
    false,
    52428800,  -- 50MB
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'text/markdown']
) ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STORAGE POLICIES
-- =====================================================

-- Avatars: Anyone can view, users can upload their own
CREATE POLICY "nlearn_avatars_public_read"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'nlearn_avatars');

CREATE POLICY "nlearn_avatars_user_upload"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'nlearn_avatars'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "nlearn_avatars_user_update"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'nlearn_avatars'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "nlearn_avatars_user_delete"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'nlearn_avatars'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Thumbnails: Anyone can view, instructors/admins can upload
CREATE POLICY "nlearn_thumbnails_public_read"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'nlearn_thumbnails');

CREATE POLICY "nlearn_thumbnails_instructor_upload"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'nlearn_thumbnails'
        AND nlearn_is_instructor()
    );

CREATE POLICY "nlearn_thumbnails_instructor_update"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'nlearn_thumbnails'
        AND nlearn_is_instructor()
    );

CREATE POLICY "nlearn_thumbnails_instructor_delete"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'nlearn_thumbnails'
        AND nlearn_is_instructor()
    );

-- Certificates: Only owner can view, system creates
CREATE POLICY "nlearn_certificates_owner_read"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'nlearn_certificates'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- System creates certificates via service_role (bypasses RLS)

-- Attachments: Owner can CRUD
CREATE POLICY "nlearn_attachments_owner_read"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'nlearn_attachments'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "nlearn_attachments_user_upload"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'nlearn_attachments'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "nlearn_attachments_user_update"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'nlearn_attachments'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "nlearn_attachments_user_delete"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'nlearn_attachments'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );
