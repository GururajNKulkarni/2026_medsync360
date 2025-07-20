/*
  # Add Storage Metadata Trigger for Automatic File Tracking

  1. Purpose
    - Automatically add metadata to storage objects for audit trails
    - Track uploaded_by and uploaded_at for every file upload
    - Provide additional layer of file tracking beyond application level
  
  2. Benefits
    - Automatic audit trail for all file uploads
    - Database-level tracking that doesn't rely on application code
    - Enhanced debugging and monitoring capabilities
    - Compliance support for medical record keeping
*/

-- Create the metadata insertion function with improved error handling
CREATE OR REPLACE FUNCTION storage.insert_referral_attachment_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate input - only process referral_attachments bucket
  IF NEW.bucket_id IS DISTINCT FROM 'referral_attachments' THEN
    RETURN NEW;  -- Skip processing for other buckets
  END IF;

  -- Ensure metadata exists (initialize as empty JSON if null)
  IF NEW.metadata IS NULL THEN
    NEW.metadata = '{}'::jsonb;
  END IF;

  -- Add uploaded_by if not exists (use current authenticated user)
  IF NEW.metadata->>'uploaded_by' IS NULL THEN
    NEW.metadata = jsonb_set(
      NEW.metadata, 
      '{uploaded_by}', 
      to_jsonb(COALESCE(
        auth.uid()::text, 
        'unknown'
      ))
    );
  END IF;
  
  -- Add uploaded_at if not exists (current timestamp)
  IF NEW.metadata->>'uploaded_at' IS NULL THEN
    NEW.metadata = jsonb_set(
      NEW.metadata, 
      '{uploaded_at}', 
      to_jsonb(NOW()::text)
    );
  END IF;
  
  -- Add file tracking metadata for medical compliance
  IF NEW.metadata->>'tracked_for_medical_compliance' IS NULL THEN
    NEW.metadata = jsonb_set(
      NEW.metadata, 
      '{tracked_for_medical_compliance}', 
      to_jsonb('true')
    );
  END IF;
  
  RETURN NEW;
EXCEPTION 
  WHEN OTHERS THEN
    -- Log the error and continue (don't break file uploads due to metadata issues)
    RAISE WARNING 'Error in insert_referral_attachment_metadata: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove existing trigger if it exists to avoid conflicts
DROP TRIGGER IF EXISTS referral_attachment_metadata_trigger ON storage.objects;

-- Create the trigger to automatically run the function
CREATE TRIGGER referral_attachment_metadata_trigger
BEFORE INSERT ON storage.objects
FOR EACH ROW 
WHEN (NEW.bucket_id = 'referral_attachments')
EXECUTE FUNCTION storage.insert_referral_attachment_metadata();

-- Add comment for documentation
COMMENT ON FUNCTION storage.insert_referral_attachment_metadata() IS 'Automatically adds tracking metadata to referral attachment uploads for audit trails and medical compliance';

-- Verify the trigger was created
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name = 'referral_attachment_metadata_trigger';
