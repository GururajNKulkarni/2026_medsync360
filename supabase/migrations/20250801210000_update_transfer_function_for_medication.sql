CREATE OR REPLACE FUNCTION transfer_referral(
  p_original_referral_id UUID,
  p_new_to_user_id UUID,
  p_new_to_department TEXT,
  p_transfer_reason TEXT DEFAULT NULL,
  p_transfer_notes TEXT DEFAULT NULL,
  p_transferred_by_user_id UUID DEFAULT NULL,
  p_updated_medication_on_transfer TEXT DEFAULT NULL -- New parameter for medication updates
) RETURNS UUID 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_original_referral referrals%ROWTYPE;
  v_new_referral_id UUID;
  v_final_medication TEXT;
BEGIN
  -- Get the original referral
  SELECT * INTO v_original_referral 
  FROM referrals 
  WHERE id = p_original_referral_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Original referral not found: %', p_original_referral_id;
  END IF;
  
  -- Determine the medication to be used for the new referral
  v_final_medication := COALESCE(p_updated_medication_on_transfer, v_original_referral.medication_given);

  -- If medication was updated during transfer, record it in the history
  IF p_updated_medication_on_transfer IS NOT NULL AND p_updated_medication_on_transfer <> v_original_referral.medication_given THEN
    INSERT INTO public.medication_history (referral_id, medication_text, update_type, updated_by, notes)
    VALUES (p_original_referral_id, p_updated_medication_on_transfer, 'transfer_update', p_transferred_by_user_id, 'Medication updated during transfer.');
  END IF;

  -- Create new referral for the recipient
  INSERT INTO referrals (
    title, description, urgency, from_user_id, to_user_id, to_department, 
    from_department, patient_name, patient_age, patient_sex, admission_date, 
    medication_given, attachments, status, transfer_parent_id, transfer_reason, 
    transfer_notes, transferred_from_user_id, transferred_from_department, transferred_at
  ) VALUES (
    v_original_referral.title, v_original_referral.description, v_original_referral.urgency, 
    p_transferred_by_user_id, p_new_to_user_id, p_new_to_department, 
    (SELECT department FROM users WHERE id = p_transferred_by_user_id), 
    v_original_referral.patient_name, v_original_referral.patient_age, v_original_referral.patient_sex, 
    v_original_referral.admission_date, v_final_medication, v_original_referral.attachments, 
    'Received', p_original_referral_id, p_transfer_reason, p_transfer_notes, 
    v_original_referral.to_user_id, v_original_referral.to_department, NOW()
  ) RETURNING id INTO v_new_referral_id;
  
  -- Update original referral to mark as transferred
  UPDATE referrals 
  SET 
    status = 'Transferred',
    transfer_notes = p_transfer_notes,
    transfer_reason = p_transfer_reason,
    transferred_at = NOW()
  WHERE id = p_original_referral_id;
  
  -- Copy any referral attachments to the new referral (This part is simplified for brevity, assuming it exists)
  
  RETURN v_new_referral_id;
END;
$$;
