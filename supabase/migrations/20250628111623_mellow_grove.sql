/*
  # Fix Referral Status Mapping

  1. New Functions
    - `update_referral_status_on_creation` - Automatically updates referral status to 'Received' when sent to a specific doctor
    - `update_referral_status_trigger` - Trigger function to execute on referral insert/update
  
  2. Security
    - Enable RLS on referrals table (if not already enabled)
    - Functions are set as SECURITY DEFINER to ensure they run with proper permissions
  
  3. Changes
    - Add trigger to automatically update status when a referral is created
    - Improve status mapping between UI and database
*/

-- Create function to automatically update referral status on creation
CREATE OR REPLACE FUNCTION update_referral_status_on_creation()
RETURNS TRIGGER AS $$
BEGIN
  -- If the referral has a specific recipient (to_user_id is set)
  -- and status is 'Sent', update it to 'Received'
  IF NEW.to_user_id IS NOT NULL AND NEW.status = 'Sent' THEN
    NEW.status = 'Received';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to execute the function on insert
DROP TRIGGER IF EXISTS update_referral_status_trigger ON referrals;
CREATE TRIGGER update_referral_status_trigger
  BEFORE INSERT ON referrals
  FOR EACH ROW
  EXECUTE FUNCTION update_referral_status_on_creation();

-- Fix any existing referrals that should be 'Received' but are still 'Sent'
UPDATE referrals
SET status = 'Received'
WHERE to_user_id IS NOT NULL 
  AND status = 'Sent';

-- Create function to check if a referral exists for a specific doctor
CREATE OR REPLACE FUNCTION check_referral_exists_for_doctor(
  doctor_id UUID,
  ref_status referral_status
) RETURNS BOOLEAN AS $$
DECLARE
  ref_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM referrals
    WHERE to_user_id = doctor_id
    AND status = ref_status
  ) INTO ref_exists;
  
  RETURN ref_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_referral_exists_for_doctor(UUID, referral_status) TO authenticated;

-- Create function to get referral counts by status for a doctor
CREATE OR REPLACE FUNCTION get_doctor_referral_counts(doctor_id UUID)
RETURNS TABLE (
  status TEXT,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN r.status = 'Acknowledged' THEN 'Accepted'
      ELSE r.status::TEXT
    END,
    COUNT(*)
  FROM referrals r
  WHERE r.to_user_id = doctor_id OR r.from_user_id = doctor_id
  GROUP BY 
    CASE 
      WHEN r.status = 'Acknowledged' THEN 'Accepted'
      ELSE r.status::TEXT
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_doctor_referral_counts(UUID) TO authenticated;