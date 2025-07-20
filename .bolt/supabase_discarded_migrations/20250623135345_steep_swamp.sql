/*
  # Create referral attachments storage bucket

  1. Storage Setup
    - Create 'referral_attachments' storage bucket
    - Set bucket to private (public = false)
    - Configure proper RLS policies for authenticated users

  2. Security
    - Allow authenticated users to upload files
    - Allow authenticated users to view files
    - Restrict access to authenticated users only
*/

-- Create storage bucket for referral attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'referral_attachments', 
  'referral_attachments', 
  false,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload referral attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can view referral attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their referral attachments" ON storage.objects;

-- Policy for authenticated users to upload attachments
CREATE POLICY "Users can upload referral attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'referral_attachments');

-- Policy for authenticated users to view attachments
CREATE POLICY "Users can view referral attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'referral_attachments');

-- Policy for authenticated users to delete their attachments
CREATE POLICY "Users can delete their referral attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'referral_attachments');

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;