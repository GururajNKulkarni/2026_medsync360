/*
  # Fix Referral Attachment Storage Issues

  1. Changes
    - Update referral_attachments bucket to be public
    - Create proper storage policies for public access
    - Fix attachment URLs to use the correct Supabase project URL
    - Add diagnostic functions to troubleshoot attachment issues
  
  2. Purpose
    - Resolve the "Storage Bucket: Not Found" issue in the diagnostic report
    - Ensure attachments are properly accessible via public URLs
    - Provide tools to diagnose and fix attachment issues
*/

-- Make sure the referral_attachments bucket exists and is public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'referral_attachments';

-- Drop existing storage policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Public can access referral attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view referral attachments" ON storage.objects;

-- Create policy for public access to referral attachments
CREATE POLICY "Public can access referral attachments"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'referral_attachments');

-- Update all attachment URLs to use the correct Supabase project URL
UPDATE referral_attachments
SET file_url = 'https://hokostygwqtezidzdyzo.supabase.co/storage/v1/object/public/referral_attachments/' || file_name
WHERE file_url IS NULL OR file_url = '' OR file_url NOT LIKE 'https://hokostygwqtezidzdyzo.supabase.co%';

-- Create a diagnostic function to check attachment configuration
CREATE OR REPLACE FUNCTION diagnose_attachment_system()
RETURNS jsonb AS $$
DECLARE
  result jsonb;
  bucket_exists boolean;
  bucket_public boolean;
  policy_exists boolean;
  attachment_count integer;
  attachment_with_url_count integer;
BEGIN
  -- Check if bucket exists and is public
  SELECT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'referral_attachments'
  ) INTO bucket_exists;
  
  IF bucket_exists THEN
    SELECT public INTO bucket_public
    FROM storage.buckets
    WHERE id = 'referral_attachments';
  ELSE
    bucket_public := false;
  END IF;
  
  -- Check if public access policy exists
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Public can access referral attachments'
  ) INTO policy_exists;
  
  -- Count attachments
  SELECT COUNT(*) INTO attachment_count
  FROM referral_attachments;
  
  -- Count attachments with valid URLs
  SELECT COUNT(*) INTO attachment_with_url_count
  FROM referral_attachments
  WHERE file_url IS NOT NULL 
    AND file_url != '' 
    AND file_url LIKE 'https://hokostygwqtezidzdyzo.supabase.co%';
  
  -- Build result
  result := jsonb_build_object(
    'bucket_exists', bucket_exists,
    'bucket_public', bucket_public,
    'policy_exists', policy_exists,
    'attachment_count', attachment_count,
    'attachments_with_valid_url', attachment_with_url_count,
    'timestamp', now()
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION diagnose_attachment_system() TO authenticated;

-- Create a function to fix attachment URLs for a specific referral
CREATE OR REPLACE FUNCTION fix_referral_attachment_urls(ref_id uuid)
RETURNS integer AS $$
DECLARE
  updated_count integer := 0;
BEGIN
  -- Update attachment URLs for the specified referral
  UPDATE referral_attachments
  SET file_url = 'https://hokostygwqtezidzdyzo.supabase.co/storage/v1/object/public/referral_attachments/' || file_name
  WHERE referral_id = ref_id
    AND (file_url IS NULL OR file_url = '' OR file_url NOT LIKE 'https://hokostygwqtezidzdyzo.supabase.co%');
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION fix_referral_attachment_urls(uuid) TO authenticated;

-- Create a function to test if an attachment URL is accessible
CREATE OR REPLACE FUNCTION test_attachment_url(attachment_id uuid)
RETURNS jsonb AS $$
DECLARE
  attachment_record RECORD;
BEGIN
  -- Get attachment details
  SELECT id, file_name, file_url
  INTO attachment_record
  FROM referral_attachments
  WHERE id = attachment_id;
  
  IF attachment_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Attachment not found',
      'id', attachment_id
    );
  END IF;
  
  -- Return attachment details for testing
  RETURN jsonb_build_object(
    'success', true,
    'id', attachment_record.id,
    'file_name', attachment_record.file_name,
    'file_url', attachment_record.file_url,
    'url_valid', attachment_record.file_url LIKE 'https://hokostygwqtezidzdyzo.supabase.co%',
    'timestamp', now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION test_attachment_url(uuid) TO authenticated;

-- Run the diagnostic function and output results
SELECT * FROM diagnose_attachment_system();