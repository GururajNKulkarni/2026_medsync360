/*
  # Create medication history tracking system

  1. New Tables
    - `medication_history` table for tracking all medication updates with proper timestamps
    - Proper foreign key relationships to referrals table
  
  2. New Columns
    - Add medication tracking fields to referrals table
    
  3. Purpose
    - Enable comprehensive medication audit trail
    - Support proper timestamped medication tracking
    - Improve Excel reporting with detailed medication history
    - Support medical case history documentation
*/

-- Create medication_history table for tracking all medication updates
CREATE TABLE IF NOT EXISTS medication_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id uuid NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
  medication_text text NOT NULL,
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  update_type text NOT NULL CHECK (update_type IN ('initial', 'completion_update', 'transfer_update', 'manual_update')),
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS medication_history_referral_id_idx ON medication_history(referral_id);
CREATE INDEX IF NOT EXISTS medication_history_updated_at_idx ON medication_history(updated_at);
CREATE INDEX IF NOT EXISTS medication_history_update_type_idx ON medication_history(update_type);

-- Add medication tracking fields to referrals table
ALTER TABLE referrals 
ADD COLUMN IF NOT EXISTS last_medication_update timestamptz,
ADD COLUMN IF NOT EXISTS medication_update_count integer DEFAULT 0;

-- Add comments for documentation
COMMENT ON TABLE medication_history IS 'Tracks all medication updates for referrals with proper timestamps and audit trail';
COMMENT ON COLUMN medication_history.referral_id IS 'Foreign key to referrals table';
COMMENT ON COLUMN medication_history.medication_text IS 'The medication information that was updated';
COMMENT ON COLUMN medication_history.updated_by IS 'User who made the medication update';
COMMENT ON COLUMN medication_history.updated_at IS 'Timestamp when the medication was updated';
COMMENT ON COLUMN medication_history.update_type IS 'Type of update: initial, completion_update, transfer_update, manual_update';
COMMENT ON COLUMN medication_history.notes IS 'Additional notes about the medication update';

COMMENT ON COLUMN referrals.last_medication_update IS 'Timestamp of the most recent medication update';
COMMENT ON COLUMN referrals.medication_update_count IS 'Number of times medication has been updated';

-- Create function to automatically update referral medication tracking
CREATE OR REPLACE FUNCTION update_referral_medication_tracking()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the referrals table with latest medication info
  UPDATE referrals 
  SET 
    last_medication_update = NEW.updated_at,
    medication_update_count = (
      SELECT COUNT(*) 
      FROM medication_history 
      WHERE referral_id = NEW.referral_id
    )
  WHERE id = NEW.referral_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update tracking when medication history is inserted
CREATE TRIGGER trigger_update_medication_tracking
  AFTER INSERT ON medication_history
  FOR EACH ROW
  EXECUTE FUNCTION update_referral_medication_tracking();

-- Enable RLS on medication_history table
ALTER TABLE medication_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for medication_history
CREATE POLICY "Users can view medication history for their department's referrals"
  ON medication_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM referrals r
      JOIN users u ON (u.department = r.department OR u.department = r.from_department)
      WHERE r.id = medication_history.referral_id 
      AND u.id = auth.uid()
    )
  );

CREATE POLICY "Users can insert medication history for their department's referrals"
  ON medication_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM referrals r
      JOIN users u ON (u.department = r.department OR u.department = r.from_department)
      WHERE r.id = medication_history.referral_id 
      AND u.id = auth.uid()
    )
  );

-- Create function to migrate existing medication_given data to medication_history
CREATE OR REPLACE FUNCTION migrate_existing_medication_data()
RETURNS void AS $$
BEGIN
  -- Insert existing medication_given data as initial entries
  INSERT INTO medication_history (referral_id, medication_text, update_type, updated_at, notes)
  SELECT 
    id as referral_id,
    medication_given as medication_text,
    'initial' as update_type,
    created_at as updated_at,
    'Migrated from existing medication_given field' as notes
  FROM referrals 
  WHERE medication_given IS NOT NULL 
    AND medication_given != ''
    AND NOT EXISTS (
      SELECT 1 FROM medication_history 
      WHERE referral_id = referrals.id 
      AND update_type = 'initial'
    );
  
  RAISE NOTICE 'Migrated existing medication data to medication_history table';
END;
$$ LANGUAGE plpgsql;

-- Run the migration function
SELECT migrate_existing_medication_data();

-- Verify the migration worked
SELECT 
  'Medication History Records' as table_name,
  COUNT(*) as record_count
FROM medication_history
UNION ALL
SELECT 
  'Referrals with Medication' as table_name,
  COUNT(*) as record_count
FROM referrals 
WHERE medication_given IS NOT NULL AND medication_given != '';
