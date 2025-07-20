/*
  # Fix Referral Attachments Display

  1. New Functions
    - `get_referral_attachments` - Retrieves attachment details for a referral
    - `referral_has_attachments` - Checks if a referral has any attachments
    - `migrate_referral_attachments` - Migrates attachments from array to dedicated table
  
  2. Storage Setup
    - Creates referral_attachments bucket if it doesn't exist
    - Sets up appropriate storage policies for attachment access
  
  3. Migration
    - Moves attachments from the array to a dedicated table
    - Preserves backward compatibility
*/

-- Create function to get attachment details for a referral
CREATE OR REPLACE FUNCTION get_referral_attachments(ref_id uuid)
RETURNS TABLE (
  id uuid,
  file_name text,
  file_type text,
  file_size integer,
  file_url text,
  uploaded_by uuid,
  uploader_name text,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ra.id,
    ra.file_name,
    ra.file_type,
    ra.file_size,
    ra.file_url,
    ra.uploaded_by,
    u.full_name as uploader_name,
    ra.created_at
  FROM referral_attachments ra
  LEFT JOIN users u ON ra.uploaded_by = u.id
  WHERE ra.referral_id = ref_id
  ORDER BY ra.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_referral_attachments(uuid) TO authenticated;

-- Create storage bucket for referral attachments if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'referral_attachments', 
  'referral_attachments', 
  false,
  52428800, -- 50MB limit
  ARRAY[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'text/plain',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'text/plain',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

-- Set up storage policies for referral attachments
DO $$ 
BEGIN
  -- Policy for authenticated users to upload attachments
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can upload referral attachments'
  ) THEN
    CREATE POLICY "Users can upload referral attachments"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'referral_attachments');
  END IF;

  -- Policy for authenticated users to view attachments
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can view referral attachments'
  ) THEN
    CREATE POLICY "Users can view referral attachments"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'referral_attachments');
  END IF;
END $$;

-- Create function to check if a referral has attachments
CREATE OR REPLACE FUNCTION referral_has_attachments(ref_id uuid)
RETURNS boolean AS $$
DECLARE
  has_attachments boolean;
BEGIN
  -- First check the referral_attachments table
  SELECT EXISTS (
    SELECT 1 FROM referral_attachments
    WHERE referral_id = ref_id
    LIMIT 1
  ) INTO has_attachments;
  
  -- If no attachments found in the table, check the attachments array in referrals
  IF NOT has_attachments THEN
    SELECT EXISTS (
      SELECT 1 FROM referrals
      WHERE id = ref_id
      AND attachments IS NOT NULL
      AND array_length(attachments, 1) > 0
    ) INTO has_attachments;
  END IF;
  
  RETURN has_attachments;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION referral_has_attachments(uuid) TO authenticated;

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
          uploaded_by
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
          ref.from_user_id
        );
      END IF;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the migration function
SELECT migrate_referral_attachments();