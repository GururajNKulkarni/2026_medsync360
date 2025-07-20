/*
  # Add medication_given column to referrals table

  1. Changes
    - Add medication_given column to referrals table for tracking medications given before referral
    - This is important for medical continuity and reporting purposes
  
  2. Purpose
    - Enable tracking of medications administered before referral
    - Support medical reporting and Excel export functionality
    - Improve patient care continuity
*/

-- Add medication_given column to referrals table
ALTER TABLE referrals 
ADD COLUMN IF NOT EXISTS medication_given text;

-- Add comment to document the column purpose
COMMENT ON COLUMN referrals.medication_given IS 'Medications given to patient before referral - important for medical continuity and reporting';

-- Update existing referrals to have null medication_given (this is fine for existing records)
-- No need to set default values for existing records as null is appropriate

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'referrals' 
  AND column_name = 'medication_given';
