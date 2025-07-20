/*
  # Fix Referral Attachment Storage Issues

  1. Changes
    - Create referral_attachments bucket if it doesn't exist
    - Set bucket to public for direct URL access
    - Create proper storage policies for public access
    - Update attachment URLs to use the correct Supabase project URL
    - Add diagnostic functions to verify attachment configuration

  2. Security
    - Enable public access to attachment files
    - Maintain RLS policies for attachment records
*/

-- Make sure the referral_attachments bucket exists and is public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'referral_attachments', 
  'referral_attachments', 
  true, -- Make public for direct URL access
  52428800, -- 50MB limit
  ARRAY[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'text/plain',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = true, -- Ensure bucket is public
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'text/plain',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

-- Drop existing storage policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Public can access referral attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view referral attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can view referral attachments" ON storage.objects;

-- Create policy for public access to referral attachments
CREATE POLICY "Public can access referral attachments"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'referral_attachments');

-- Create referral_attachments table if it doesn't exist
CREATE TABLE IF NOT EXISTS referral_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id uuid NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_type text,
  file_size integer,
  file_url text,
  uploaded_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE referral_attachments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view attachments for referrals they can access" ON referral_attachments;
DROP POLICY IF EXISTS "Users can upload attachments to their referrals" ON referral_attachments;
DROP POLICY IF EXISTS "Users can delete their own attachments" ON referral_attachments;

-- Create policies
CREATE POLICY "Users can view attachments for referrals they can access"
  ON referral_attachments
  FOR SELECT
  TO authenticated
  USING (
    referral_id IN (
      SELECT id FROM referrals
      WHERE from_user_id = auth.uid() 
         OR to_user_id = auth.uid()
         OR to_department IN (
            SELECT department FROM users WHERE id = auth.uid()
         )
    )
  );

CREATE POLICY "Users can upload attachments to their referrals"
  ON referral_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    referral_id IN (
      SELECT id FROM referrals
      WHERE from_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own attachments"
  ON referral_attachments
  FOR DELETE
  TO authenticated
  USING (uploaded_by = auth.uid());

-- Update all existing attachment URLs to use the correct Supabase project URL
UPDATE referral_attachments
SET file_url = 'https://hokostygwqtezidzdyzo.supabase.co/storage/v1/object/public/referral_attachments/' || file_name
WHERE file_url IS NULL OR file_url = '' OR file_url NOT LIKE 'https://hokostygwqtezidzdyzo.supabase.co%';

-- Create a function to diagnose attachment issues
CREATE OR REPLACE FUNCTION diagnose_attachment_issues(ref_id uuid)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
  ref_exists boolean;
  attachments_array text[];
  bucket_exists boolean;
  bucket_public boolean;
  attachment_count integer;
BEGIN
  -- Check if referral exists
  SELECT EXISTS (
    SELECT 1 FROM referrals WHERE id = ref_id
  ) INTO ref_exists;
  
  -- Get attachments array
  SELECT attachments INTO attachments_array
  FROM referrals
  WHERE id = ref_id;
  
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
  
  -- Count attachment records
  SELECT COUNT(*) INTO attachment_count
  FROM referral_attachments
  WHERE referral_id = ref_id;
  
  -- Build result
  result := jsonb_build_object(
    'referral_exists', ref_exists,
    'attachments_array', attachments_array,
    'attachments_array_count', array_length(attachments_array, 1),
    'bucket_exists', bucket_exists,
    'bucket_public', bucket_public,
    'attachment_records_count', attachment_count
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION diagnose_attachment_issues(uuid) TO authenticated;

-- Create a function to fix attachment URLs for a specific referral
CREATE OR REPLACE FUNCTION fix_attachment_urls(ref_id uuid)
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
GRANT EXECUTE ON FUNCTION fix_attachment_urls(uuid) TO authenticated;

-- Create function to migrate attachments from array to dedicated table
CREATE OR REPLACE FUNCTION migrate_referral_attachments()
RETURNS void AS $$
DECLARE
  ref RECORD;
  attachment_name text;
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
          file_url
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
          'https://hokostygwqtezidzdyzo.supabase.co/storage/v1/object/public/referral_attachments/' || attachment_name
        );
      END IF;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the migration function
SELECT migrate_referral_attachments();