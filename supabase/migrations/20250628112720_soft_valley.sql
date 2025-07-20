/*
  # Enhance Referral Details UI

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

-- Add helper function to get file extension
CREATE OR REPLACE FUNCTION get_file_extension(filename text)
RETURNS text AS $$
BEGIN
  RETURN COALESCE(
    nullif(regexp_replace(filename, '^.*\.', ''), filename),
    ''
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add helper function to get mime type from extension
CREATE OR REPLACE FUNCTION get_mime_type(extension text)
RETURNS text AS $$
BEGIN
  CASE lower(extension)
    WHEN 'jpg' THEN RETURN 'image/jpeg';
    WHEN 'jpeg' THEN RETURN 'image/jpeg';
    WHEN 'png' THEN RETURN 'image/png';
    WHEN 'gif' THEN RETURN 'image/gif';
    WHEN 'pdf' THEN RETURN 'application/pdf';
    WHEN 'doc' THEN RETURN 'application/msword';
    WHEN 'docx' THEN RETURN 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    WHEN 'xls' THEN RETURN 'application/vnd.ms-excel';
    WHEN 'xlsx' THEN RETURN 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    WHEN 'txt' THEN RETURN 'text/plain';
    ELSE RETURN 'application/octet-stream';
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add function to format file size
CREATE OR REPLACE FUNCTION format_file_size(size_in_bytes integer)
RETURNS text AS $$
BEGIN
  IF size_in_bytes IS NULL THEN
    RETURN 'Unknown';
  ELSIF size_in_bytes < 1024 THEN
    RETURN size_in_bytes || ' B';
  ELSIF size_in_bytes < 1048576 THEN
    RETURN round(size_in_bytes / 1024.0, 1) || ' KB';
  ELSIF size_in_bytes < 1073741824 THEN
    RETURN round(size_in_bytes / 1048576.0, 1) || ' MB';
  ELSE
    RETURN round(size_in_bytes / 1073741824.0, 1) || ' GB';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_file_extension(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_mime_type(text) TO authenticated;
GRANT EXECUTE ON FUNCTION format_file_size(integer) TO authenticated;