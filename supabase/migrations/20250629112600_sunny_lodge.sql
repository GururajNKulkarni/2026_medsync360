/*
  # Fix Referral Attachments Migration

  1. Changes
    - Fix the syntax error in migrate_referral_attachments function
    - Update the storage bucket to be public for easier access
    - Add policy for public access to referral attachments
    - Update existing attachments with proper file URLs
  
  2. Security
    - Maintain existing RLS policies
    - Ensure proper access to attachments
*/

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

-- Run the migration function
SELECT migrate_referral_attachments();

-- Update existing attachments with proper file_url if they don't have one
UPDATE referral_attachments
SET file_url = 'https://hokostygwqtezidzdyzo.supabase.co/storage/v1/object/public/referral_attachments/' || uploaded_by || '/' || file_name
WHERE file_url IS NULL OR file_url = '';