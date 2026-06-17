-- Fix transfer_referral function to copy ALL patient data from original referral
-- First drop the existing functions to avoid parameter conflicts
DROP FUNCTION IF EXISTS transfer_referral(UUID, UUID, TEXT, TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS transfer_referral(UUID, UUID, TEXT, TEXT, TEXT, UUID, TEXT);

CREATE OR REPLACE FUNCTION transfer_referral(
  p_referral_id UUID,
  p_to_user_id UUID,
  p_to_department TEXT,
  p_transfer_reason TEXT,
  p_transfer_notes TEXT DEFAULT NULL,
  p_transferred_by_user_id UUID DEFAULT NULL,
  p_updated_medication_on_transfer TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  source_referral referrals%ROWTYPE;
  new_referral_id UUID;
  transferred_from_dept TEXT;
BEGIN
  -- Get the original referral with ALL data
  SELECT * INTO source_referral
  FROM referrals
  WHERE id = p_referral_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Referral not found';
  END IF;

  -- Get the department of the user who is transferring
  SELECT department INTO transferred_from_dept
  FROM users
  WHERE id = p_transferred_by_user_id;

  -- Generate new UUID for transferred referral
  new_referral_id := gen_random_uuid();

  -- Create new referral with COMPLETE patient data from original
  INSERT INTO referrals (
    id,
    title,
    description,
    urgency,
    status,
    from_user_id,
    to_department,
    to_user_id,
    created_at,
    -- Complete patient information
    patient_name,
    patient_age,
    patient_sex,
    admission_date,
    patient_admission_time,
    room_no,
    patient_ip_no,
    past_history,
    general_examination,
    -- Medication information
    medication_given,
    initial_medication,
    -- Transfer tracking
    transfer_parent_id,
    transfer_reason,
    transfer_notes,
    transferred_from_user_id,
    transferred_from_department,
    transferred_at,
    from_department
  ) VALUES (
    new_referral_id,
    source_referral.title,
    source_referral.description,
    source_referral.urgency,
    'Received',
    p_transferred_by_user_id,
    p_to_department,
    p_to_user_id,
    NOW(),
    -- Complete patient information from original
    source_referral.patient_name,
    source_referral.patient_age,
    source_referral.patient_sex,
    source_referral.admission_date,
    source_referral.patient_admission_time,
    source_referral.room_no,
    source_referral.patient_ip_no,
    source_referral.past_history,
    source_referral.general_examination,
    -- Use updated medication if provided, otherwise use original
    COALESCE(p_updated_medication_on_transfer, source_referral.medication_given),
    source_referral.initial_medication, -- Preserve original initial medication
    -- Transfer tracking
    p_referral_id,
    p_transfer_reason,
    p_transfer_notes,
    p_transferred_by_user_id,
    transferred_from_dept,
    NOW(),
    transferred_from_dept
  );

  -- Update original referral status to 'Transferred'
  UPDATE referrals
  SET 
    status = 'Transferred',
    updated_at = NOW(),
    transferred_at = NOW()
  WHERE id = p_referral_id;

  -- Log medication update if provided
  IF p_updated_medication_on_transfer IS NOT NULL THEN
    INSERT INTO medication_history (referral_id, medication_text, update_type, updated_by, notes)
    VALUES (p_referral_id, p_updated_medication_on_transfer, 'transfer_update', p_transferred_by_user_id, 'Medication updated during transfer.');
  END IF;

  RETURN new_referral_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;