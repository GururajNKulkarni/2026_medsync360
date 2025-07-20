/*
  # Create Referral Attachments Storage Bucket and Policies

  1. New Storage Bucket
    - Creates 'referral_attachments' bucket with proper configuration
    - Sets file size limits and allowed MIME types
    - Makes bucket public for direct URL access
  
  2. Security
    - Adds public access policy for viewing attachments
    - Adds policy for authenticated users to upload attachments
    - Adds policy for users to manage their own attachments
  
  3. Migration Function
    - Creates function to migrate attachments from array to dedicated table
    - Preserves existing attachment data
*/

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

-- Create policy for public access to referral attachments
CREATE POLICY "Public can access referral attachments"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'referral_attachments');

-- Create policy for authenticated users to upload attachments
CREATE POLICY "Users can upload referral attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'referral_attachments');

-- Create policy for authenticated users to delete their attachments
CREATE POLICY "Users can delete their referral attachments"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'referral_attachments');

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