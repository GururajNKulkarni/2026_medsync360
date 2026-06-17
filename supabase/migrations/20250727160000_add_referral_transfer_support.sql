-- Migration: Add Transfer Support to Referrals
-- Description: Adds fields to support referral transfers and proper workflow tracking

-- Add transfer-related fields to referrals table
ALTER TABLE referrals 
ADD COLUMN IF NOT EXISTS transfer_parent_id UUID REFERENCES referrals(id),
ADD COLUMN IF NOT EXISTS transfer_reason TEXT,
ADD COLUMN IF NOT EXISTS transfer_notes TEXT,
ADD COLUMN IF NOT EXISTS transferred_from_user_id UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS transferred_from_department TEXT,
ADD COLUMN IF NOT EXISTS transferred_at TIMESTAMPTZ;

-- Update the referral_status enum to include 'Transferred' status
DO $$ 
BEGIN
  -- Check if 'Transferred' status already exists
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'Transferred' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'referral_status')) THEN
    ALTER TYPE referral_status ADD VALUE 'Transferred';
  END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_referrals_transfer_parent_id ON referrals(transfer_parent_id);
CREATE INDEX IF NOT EXISTS idx_referrals_transferred_from_user_id ON referrals(transferred_from_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_transferred_at ON referrals(transferred_at);

-- Add constraints
ALTER TABLE referrals 
ADD CONSTRAINT chk_transfer_parent_not_self 
CHECK (transfer_parent_id IS NULL OR transfer_parent_id != id);

-- Create function to handle referral transfers
CREATE OR REPLACE FUNCTION transfer_referral(
  p_original_referral_id UUID,
  p_new_to_user_id UUID,
  p_new_to_department TEXT,
  p_transfer_reason TEXT DEFAULT NULL,
  p_transfer_notes TEXT DEFAULT NULL,
  p_transferred_by_user_id UUID DEFAULT NULL
) RETURNS UUID 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_original_referral referrals%ROWTYPE;
  v_new_referral_id UUID;
BEGIN
  -- Get the original referral
  SELECT * INTO v_original_referral 
  FROM referrals 
  WHERE id = p_original_referral_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Original referral not found: %', p_original_referral_id;
  END IF;
  
  -- Create new referral for the recipient
  INSERT INTO referrals (
    title,
    description,
    urgency,
    from_user_id,
    to_user_id,
    to_department,
    from_department,
    patient_name,
    patient_age,
    patient_sex,
    admission_date,
    medication_given,
    attachments,
    status,
    transfer_parent_id,
    transfer_reason,
    transfer_notes,
    transferred_from_user_id,
    transferred_from_department,
    transferred_at
  ) VALUES (
    v_original_referral.title,
    v_original_referral.description,
    v_original_referral.urgency,
    p_transferred_by_user_id, -- The doctor doing the transfer
    p_new_to_user_id,
    p_new_to_department,
    (SELECT department FROM users WHERE id = p_transferred_by_user_id),
    v_original_referral.patient_name,
    v_original_referral.patient_age,
    v_original_referral.patient_sex,
    v_original_referral.admission_date,
    v_original_referral.medication_given,
    v_original_referral.attachments,
    'Received', -- New referral starts as Received
    p_original_referral_id,
    p_transfer_reason,
    p_transfer_notes,
    v_original_referral.to_user_id, -- Who originally received it
    v_original_referral.to_department,
    NOW()
  ) RETURNING id INTO v_new_referral_id;
  
  -- Update original referral to mark as transferred
  UPDATE referrals 
  SET 
    status = 'Transferred',
    transfer_notes = p_transfer_notes,
    transfer_reason = p_transfer_reason,
    transferred_at = NOW()
  WHERE id = p_original_referral_id;
  
  -- Copy any referral attachments to the new referral
  INSERT INTO referral_attachments (
    referral_id,
    file_name,
    original_file_name,
    file_type,
    file_url,
    uploaded_by
  )
  SELECT 
    v_new_referral_id,
    file_name,
    original_file_name,
    file_type,
    file_url,
    p_transferred_by_user_id
  FROM referral_attachments 
  WHERE referral_id = p_original_referral_id;
  
  RETURN v_new_referral_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to get transfer history for a referral
CREATE OR REPLACE FUNCTION get_referral_transfer_history(p_referral_id UUID)
RETURNS TABLE (
  referral_id UUID,
  from_doctor TEXT,
  from_department TEXT,
  to_doctor TEXT,
  to_department TEXT,
  transfer_reason TEXT,
  transfer_notes TEXT,
  transferred_at TIMESTAMPTZ,
  is_original BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE transfer_chain AS (
    -- Start with the given referral
    SELECT 
      r.id,
      r.transfer_parent_id,
      r.transfer_reason,
      r.transfer_notes,
      r.transferred_at,
      fu.full_name as from_user_name,
      r.transferred_from_department,
      tu.full_name as to_user_name,
      r.to_department,
      1 as level,
      CASE WHEN r.transfer_parent_id IS NULL THEN true ELSE false END as is_original
    FROM referrals r
    LEFT JOIN users fu ON r.transferred_from_user_id = fu.id
    LEFT JOIN users tu ON r.to_user_id = tu.id
    WHERE r.id = p_referral_id
    
    UNION ALL
    
    -- Recursively find parent referrals
    SELECT 
      r.id,
      r.transfer_parent_id,
      r.transfer_reason,
      r.transfer_notes,
      r.transferred_at,
      fu.full_name as from_user_name,
      r.transferred_from_department,
      tu.full_name as to_user_name,
      r.to_department,
      tc.level + 1,
      CASE WHEN r.transfer_parent_id IS NULL THEN true ELSE false END as is_original
    FROM referrals r
    LEFT JOIN users fu ON r.transferred_from_user_id = fu.id
    LEFT JOIN users tu ON r.to_user_id = tu.id
    INNER JOIN transfer_chain tc ON r.id = tc.transfer_parent_id
  )
  SELECT 
    tc.id,
    tc.from_user_name,
    tc.transferred_from_department,
    tc.to_user_name,
    tc.to_department,
    tc.transfer_reason,
    tc.transfer_notes,
    tc.transferred_at,
    tc.is_original
  FROM transfer_chain tc
  ORDER BY tc.level DESC, tc.transferred_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON COLUMN referrals.transfer_parent_id IS 'ID of the original referral if this is a transferred referral';
COMMENT ON COLUMN referrals.transfer_reason IS 'Reason for transferring the referral';
COMMENT ON COLUMN referrals.transfer_notes IS 'Additional notes about the transfer';
COMMENT ON COLUMN referrals.transferred_from_user_id IS 'User who originally received the referral before transfer';
COMMENT ON COLUMN referrals.transferred_from_department IS 'Department that originally received the referral';
COMMENT ON COLUMN referrals.transferred_at IS 'Timestamp when the referral was transferred';

COMMENT ON FUNCTION transfer_referral IS 'Creates a new referral for transfer and updates the original referral status';
COMMENT ON FUNCTION get_referral_transfer_history IS 'Returns the complete transfer history chain for a referral';
