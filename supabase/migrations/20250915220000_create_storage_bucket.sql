-- Migration: Create storage bucket for business files
-- Description: Creates a storage bucket for backing up business files (logos, menus, offers)
-- Date: 2025-09-15 22:00:00 UTC

-- Create the business-files storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'business-files',
  'business-files',
  false, -- Private bucket, requires authentication
  52428800, -- 50MB file size limit
  ARRAY[
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp',
    'application/pdf'
  ]
);

-- Create RLS policy for the storage bucket - users can only access their own files
CREATE POLICY "Users can upload their own business files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'business-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own business files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'business-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own business files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'business-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own business files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'business-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Storage bucket and RLS policies created successfully
