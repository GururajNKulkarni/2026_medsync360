/*
  # Create Referral Attachments Storage Bucket

  1. Purpose
    - Create the referral_attachments storage bucket
    - Set up proper RLS policies for secure file access
    - Configure public access for file viewing
  
  2. Security
    - Users can only upload files when authenticated
    - Users can view files from public bucket
    - Proper RLS policies for data protection
*/

-- Create the storage bucket for referral attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('referral_attachments', 'referral_attachments', true)
ON CONFLICT (id) DO UPDATE SET
  public = true;

-- Enable RLS on storage.objects table (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to upload files to referral_attachments bucket
CREATE POLICY "Allow authenticated users to upload referral attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'referral_attachments');

-- Policy: Allow authenticated users to view files in referral_attachments bucket
CREATE POLICY "Allow authenticated users to view referral attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'referral_attachments');

-- Policy: Allow public access to referral_attachments for viewing (since bucket is public)
CREATE POLICY "Allow public read access to referral attachments"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'referral_attachments');

-- Policy: Allow authenticated users to update their own files
CREATE POLICY "Allow authenticated users to update their own referral attachments"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'referral_attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy: Allow authenticated users to delete their own files
CREATE POLICY "Allow authenticated users to delete their own referral attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'referral_attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Verify the bucket was created
SELECT id, name, public, created_at
FROM storage.buckets
WHERE id = 'referral_attachments';

-- Comment for documentation
COMMENT ON POLICY "Allow authenticated users to upload referral attachments" ON storage.objects IS 'Allows authenticated users to upload files to referral_attachments bucket';
COMMENT ON POLICY "Allow public read access to referral attachments" ON storage.objects IS 'Allows public read access to files in referral_attachments bucket for viewing medical documents';
