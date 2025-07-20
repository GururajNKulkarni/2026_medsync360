/*
  # Create Referral Attachments Function

  1. New RPC Function
    - Creates a function to retrieve attachments for a referral
    - Combines data from referral_attachments table and users table
    - Returns formatted attachment data with uploader information
*/

-- Create function to get referral attachments with uploader info
CREATE OR REPLACE FUNCTION get_referral_attachments(ref_id uuid)
RETURNS TABLE (
  id uuid,
  file_name text,
  file_type text,
  file_size integer,
  file_url text,
  uploader_id uuid,
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
    u.full_name,
    ra.created_at
  FROM 
    referral_attachments ra
  LEFT JOIN 
    users u ON ra.uploaded_by = u.id
  WHERE 
    ra.referral_id = ref_id
  ORDER BY 
    ra.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_referral_attachments(uuid) TO authenticated;