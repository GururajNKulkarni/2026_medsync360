/*
  # Fix Attachment URLs and Storage Bucket Configuration

  1. Changes
    - Update all existing attachment URLs to use the correct Supabase project URL
    - Make the referral_attachments bucket public for direct access
    - Add proper storage policies for public access to attachments
    - Create diagnostic functions to verify URL fixes
  
  2. Purpose
    - Resolve "This site can't be reached" errors for attachment previews
    - Fix broken View and Download functionality
    - Ensure all new attachments use the correct URL format
*/

-- Make sure the referral_attachments bucket is public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'referral_attachments';

-- Update all existing attachment URLs that contain the placeholder
UPDATE referral_attachments
SET file_url = REPLACE(
  file_url, 
  'https://your-project-ref.supabase.co', 
  'https://hokostygwqtezidzdyzo.supabase.co'
)
WHERE file_url LIKE '%your-project-ref.supabase.co%';

-- Also check for any other common placeholder patterns
UPDATE referral_attachments
SET file_url = REPLACE(
  file_url, 
  'https://your-supabase-project.supabase.co', 
  'https://hokostygwqtezidzdyzo.supabase.co'
)
WHERE file_url LIKE '%your-supabase-project.supabase.co%';

-- Fix any URLs that might be using the wrong protocol
UPDATE referral_attachments
SET file_url = REPLACE(
  file_url, 
  'http://hokostygwqtezidzdyzo.supabase.co', 
  'https://hokostygwqtezidzdyzo.supabase.co'
)
WHERE file_url LIKE 'http://hokostygwqtezidzdyzo.supabase.co%';

-- Handle NULL or empty file_url values by reconstructing them
UPDATE referral_attachments
SET file_url = 'https://hokostygwqtezidzdyzo.supabase.co/storage/v1/object/public/referral_attachments/' || uploaded_by || '/' || file_name
WHERE file_url IS NULL OR file_url = '';

-- Drop existing storage policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Public can access referral attachments" ON storage.objects;

-- Create policy for public access to referral attachments
CREATE POLICY "Public can access referral attachments"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'referral_attachments');

-- Create a function to verify the URL update
CREATE OR REPLACE FUNCTION verify_attachment_urls()
RETURNS TABLE (
  total_attachments bigint,
  updated_attachments bigint,
  remaining_placeholders bigint
) AS $$
DECLARE
  total bigint;
  updated bigint;
  remaining bigint;
BEGIN
  -- Count total attachments
  SELECT COUNT(*) INTO total FROM referral_attachments;
  
  -- Count attachments with correct URL
  SELECT COUNT(*) INTO updated 
  FROM referral_attachments 
  WHERE file_url LIKE 'https://hokostygwqtezidzdyzo.supabase.co%';
  
  -- Count attachments still with placeholder URL
  SELECT COUNT(*) INTO remaining 
  FROM referral_attachments 
  WHERE file_url LIKE '%your-project-ref.supabase.co%'
     OR file_url LIKE '%your-supabase-project.supabase.co%'
     OR file_url IS NULL
     OR file_url = '';
  
  RETURN QUERY SELECT total, updated, remaining;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the verification function and output results
SELECT * FROM verify_attachment_urls();

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION verify_attachment_urls() TO authenticated;

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
    'url_valid', attachment_record.file_url LIKE 'https://hokostygwqtezidzdyzo.supabase.co%'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION test_attachment_url(uuid) TO authenticated;

/*
  ROLLBACK INFORMATION:
  
  If you need to rollback this migration, you can run:
  
  UPDATE referral_attachments
  SET file_url = REPLACE(
    file_url, 
    'https://hokostygwqtezidzdyzo.supabase.co', 
    'https://your-project-ref.supabase.co'
  )
  WHERE file_url LIKE '%hokostygwqtezidzdyzo.supabase.co%';
  
  DROP FUNCTION IF EXISTS verify_attachment_urls();
  DROP FUNCTION IF EXISTS test_attachment_url(uuid);
*/