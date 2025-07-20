/*
  # Fix Referral Attachments and File URLs

  1. Changes
    - Make referral_attachments bucket public for easier access
    - Update storage policies to allow public access to attachments
    - Fix the migrate_referral_attachments function to properly set file_url
    - Update existing attachments with proper file URLs
    - Add helper functions for attachment management

  2. Security
    - Maintain RLS policies for proper access control
    - Allow public access to attachment files for viewing
*/

-- Make sure the referral_attachments bucket is public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'referral_attachments';

-- Drop existing storage policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Anyone can view referral attachments" ON storage.objects;

-- Create policy for public access to referral attachments
CREATE POLICY "Anyone can view referral attachments"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'referral_attachments');

-- Drop the existing function to avoid conflicts
DROP FUNCTION IF EXISTS migrate_referral_attachments();

-- Create function to migrate attachments from array to dedicated table with proper file_url
CREATE OR REPLACE FUNCTION migrate_referral_attachments()
RETURNS void AS $$
DECLARE
  ref RECORD;
  attachment_name text;
  supabase_url text := 'https://hokostygwqtezidzdyzo.supabase.co'; -- Your Supabase URL
BEGIN
  FOR ref IN SELECT id, attachments, from_user_id FROM referrals WHERE attachments IS NOT NULL AND array_length(attachments, 1) > 0
  LOOP
    FOREACH attachment_name IN ARRAY ref.attachments
    LOOP
      -- Check if this attachment already exists in the table
      IF NOT EXISTS (
        SELECT 1 FROM referral_attachments
        WHERE referral_id = ref.id AND file_name = attachment_name
      ) THEN
        -- Insert the attachment into the dedicated table
        INSERT INTO referral_attachments (
          referral_id,
          file_name,
          file_type,
          uploaded_by,
          file_url  -- This comma was missing in the previous migration
        ) VALUES (
          ref.id,
          attachment_name,
          CASE 
            WHEN attachment_name LIKE '%.pdf' THEN 'application/pdf'
            WHEN attachment_name LIKE '%.jpg' OR attachment_name LIKE '%.jpeg' THEN 'image/jpeg'
            WHEN attachment_name LIKE '%.png' THEN 'image/png'
            WHEN attachment_name LIKE '%.doc' OR attachment_name LIKE '%.docx' THEN 'application/msword'
            ELSE 'application/octet-stream'
          END,
          ref.from_user_id,
          supabase_url || '/storage/v1/object/public/referral_attachments/' || ref.from_user_id || '/' || attachment_name
        );
      END IF;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the migration function
SELECT migrate_referral_attachments();

-- Update existing attachments with proper file_url if they don't have one
UPDATE referral_attachments
SET file_url = 'https://hokostygwqtezidzdyzo.supabase.co/storage/v1/object/public/referral_attachments/' || uploaded_by || '/' || file_name
WHERE file_url IS NULL OR file_url = '';

-- Create function to test attachment access
CREATE OR REPLACE FUNCTION test_attachment_access(attachment_id uuid)
RETURNS jsonb AS $$
DECLARE
  attachment_record RECORD;
  result jsonb;
BEGIN
  -- Get attachment details
  SELECT ra.id, ra.file_name, ra.file_url
  INTO attachment_record
  FROM referral_attachments ra
  WHERE ra.id = attachment_id;
  
  IF attachment_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Attachment not found',
      'id', attachment_id
    );
  END IF;
  
  -- Return attachment details
  RETURN jsonb_build_object(
    'success', true,
    'id', attachment_record.id,
    'file_name', attachment_record.file_name,
    'file_url', attachment_record.file_url
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION test_attachment_access(uuid) TO authenticated;