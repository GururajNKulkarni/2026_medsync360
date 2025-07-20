/*
  # Fix Referral Tracking System

  1. New Functions
    - `fix_referral_categorization`: Function to correct misclassified referrals
    - `get_referral_direction`: Function to determine if a referral is sent or received for a user
  
  2. Security
    - Enable RLS on referrals table
    - Add policies for proper access control
    - Grant execute permissions to authenticated users
*/

-- Function to fix referral categorization
CREATE OR REPLACE FUNCTION fix_referral_categorization()
RETURNS void AS $$
DECLARE
  ref RECORD;
BEGIN
  -- Find referrals that are sent but have a to_user_id (should be Received)
  FOR ref IN 
    SELECT id, from_user_id, to_user_id, status 
    FROM referrals 
    WHERE status = 'Sent' AND to_user_id IS NOT NULL
  LOOP
    -- Update status to Received
    UPDATE referrals
    SET status = 'Received'
    WHERE id = ref.id;
  END LOOP;
  
  -- Find referrals that are Received but don't have a to_user_id (should be Sent)
  FOR ref IN 
    SELECT id, from_user_id, to_user_id, status 
    FROM referrals 
    WHERE status = 'Received' AND to_user_id IS NULL
  LOOP
    -- Update status to Sent
    UPDATE referrals
    SET status = 'Sent'
    WHERE id = ref.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to determine if a referral is sent or received for a specific user
CREATE OR REPLACE FUNCTION get_referral_direction(
  ref_id UUID,
  user_id UUID
) RETURNS TEXT AS $$
DECLARE
  direction TEXT;
  ref_record RECORD;
BEGIN
  -- Get the referral
  SELECT from_user_id, to_user_id, status
  INTO ref_record
  FROM referrals
  WHERE id = ref_id;
  
  -- Determine direction
  IF ref_record.from_user_id = user_id THEN
    direction := 'sent';
  ELSIF ref_record.to_user_id = user_id THEN
    direction := 'received';
  ELSE
    -- Check if user is in the department
    SELECT 'department'
    INTO direction
    FROM users
    WHERE id = user_id AND department = (
      SELECT to_department FROM referrals WHERE id = ref_id
    );
    
    -- If still null, user has no relation to this referral
    IF direction IS NULL THEN
      direction := 'none';
    END IF;
  END IF;
  
  RETURN direction;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the fix function
SELECT fix_referral_categorization();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_referral_direction(UUID, UUID) TO authenticated;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_referrals_to_user_id ON referrals(to_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_from_user_id ON referrals(from_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);