-- Add new patient detail fields to referrals table
-- Generated on: July 28, 2025

-- Add new columns to referrals table
ALTER TABLE referrals 
ADD COLUMN IF NOT EXISTS room_no VARCHAR(50),
ADD COLUMN IF NOT EXISTS patient_ip_no VARCHAR(100),
ADD COLUMN IF NOT EXISTS patient_admission_time TIME,
ADD COLUMN IF NOT EXISTS past_history TEXT,
ADD COLUMN IF NOT EXISTS general_examination TEXT;

-- Add comments for documentation
COMMENT ON COLUMN referrals.room_no IS 'Patient room number';
COMMENT ON COLUMN referrals.patient_ip_no IS 'Patient IP (Inpatient) number';
COMMENT ON COLUMN referrals.patient_admission_time IS 'Patient admission time';
COMMENT ON COLUMN referrals.past_history IS 'Patient medical past history';
COMMENT ON COLUMN referrals.general_examination IS 'Patient general examination findings';

-- Update any existing referrals to have empty strings instead of null
UPDATE referrals 
SET 
  room_no = COALESCE(room_no, ''),
  patient_ip_no = COALESCE(patient_ip_no, ''),
  past_history = COALESCE(past_history, ''),
  general_examination = COALESCE(general_examination, '')
WHERE 
  room_no IS NULL 
  OR patient_ip_no IS NULL 
  OR past_history IS NULL 
  OR general_examination IS NULL;
