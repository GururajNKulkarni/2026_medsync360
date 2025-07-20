/*
  # Create referral_attachments table for storing attachment metadata

  1. New Tables
    - `referral_attachments` - Stores metadata about referral attachments
      - `id` (uuid, primary key)
      - `referral_id` (uuid, foreign key to referrals)
      - `file_name` (text)
      - `file_type` (text)
      - `file_size` (integer)
      - `file_url` (text)
      - `uploaded_by` (uuid, foreign key to users)
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS on `referral_attachments` table
    - Add policies for authenticated users to manage attachments
*/

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
  true, -- Make public for easier access
  52428800, -- 50MB limit
  ARRAY[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'text/plain',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
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

  -- Policy for anyone to view attachments (since bucket is public)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Anyone can view referral attachments'
  ) THEN
    CREATE POLICY "Anyone can view referral attachments"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'referral_attachments');
  END IF;
  
  -- Policy for users to delete their own attachments
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can delete their own referral attachments'
  ) THEN
    CREATE POLICY "Users can delete their own referral attachments"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'referral_attachments' AND
      (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;
END $$;

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