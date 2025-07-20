/*
  # Add timing columns to referrals table for processing time tracking

  1. New Columns
    - `start_time` (timestamptz) - When referral status changes to 'Accepted'
    - `end_time` (timestamptz) - When referral status changes to 'Closed'

  2. Updates
    - Add columns to track referral processing time
    - Enable automatic timestamp management
*/

-- Add timing columns to referrals table
DO $$
BEGIN
  -- Add start_time column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'referrals' AND column_name = 'start_time'
  ) THEN
    ALTER TABLE referrals ADD COLUMN start_time timestamptz;
  END IF;

  -- Add end_time column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'referrals' AND column_name = 'end_time'
  ) THEN
    ALTER TABLE referrals ADD COLUMN end_time timestamptz;
  END IF;
END $$;

-- Create function to automatically update timing columns
CREATE OR REPLACE FUNCTION update_referral_timing()
RETURNS TRIGGER AS $$
BEGIN
  -- Set start_time when status changes to 'Acknowledged' (Accepted)
  IF OLD.status != 'Acknowledged' AND NEW.status = 'Acknowledged' THEN
    NEW.start_time = now();
  END IF;

  -- Set end_time when status changes to 'Closed'
  IF OLD.status != 'Closed' AND NEW.status = 'Closed' THEN
    NEW.end_time = now();
  END IF;

  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for automatic timing updates
DROP TRIGGER IF EXISTS referral_timing_trigger ON referrals;
CREATE TRIGGER referral_timing_trigger
  BEFORE UPDATE ON referrals
  FOR EACH ROW
  EXECUTE FUNCTION update_referral_timing();

-- Create storage bucket for referral attachments if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('referral_attachments', 'referral_attachments', false)
ON CONFLICT (id) DO NOTHING;

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

  -- Policy for users to view attachments they have access to
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