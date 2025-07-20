/*
  # Fix Attachment URL Issues

  1. Changes
    - Make referral_attachments bucket public
    - Update file_url values in referral_attachments table
    - Add diagnostic functions to verify attachment URLs
    - Create public access policy for referral_attachments bucket
  
  2. Purpose
    - Resolve issues with viewing and downloading attachments
    - Ensure all attachment URLs are correctly formatted
    - Provide diagnostic tools for troubleshooting
*/

-- Make sure the referral_attachments bucket is public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'referral_attachments';

-- Update all existing attachment URLs to use the correct Supabase project URL
UPDATE referral_attachments
SET file_url = 'https://hokostygwqtezidzdyzo.supabase.co/storage/v1/object/public/referral_attachments/' || file_name
WHERE file_url IS NULL OR file_url = '' OR file_url NOT LIKE 'https://hokostygwqtezidzdyzo.supabase.co%';

-- Drop existing storage policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Public can access referral attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view referral attachments" ON storage.objects;

-- Create policy for public access to referral attachments
CREATE POLICY "Public can access referral attachments"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'referral_attachments');

-- Create a function to verify attachment URLs
CREATE OR REPLACE FUNCTION verify_attachment_urls()
RETURNS TABLE (
  total_attachments bigint,
  valid_urls bigint,
  invalid_urls bigint
) AS $$
DECLARE
  total bigint;
  valid bigint;
  invalid bigint;
BEGIN
  -- Count total attachments
  SELECT COUNT(*) INTO total FROM referral_attachments;
  
  -- Count attachments with valid URLs
  SELECT COUNT(*) INTO valid 
  FROM referral_attachments 
  WHERE file_url IS NOT NULL 
    AND file_url != '' 
    AND file_url LIKE 'https://hokostygwqtezidzdyzo.supabase.co%';
  
  -- Count attachments with invalid URLs
  SELECT COUNT(*) INTO invalid 
  FROM referral_attachments 
  WHERE file_url IS NULL 
    OR file_url = '' 
    OR file_url NOT LIKE 'https://hokostygwqtezidzdyzo.supabase.co%';
  
  RETURN QUERY SELECT total, valid, invalid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION verify_attachment_urls() TO authenticated;

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

-- Run the verification function and output results
SELECT * FROM verify_attachment_urls();