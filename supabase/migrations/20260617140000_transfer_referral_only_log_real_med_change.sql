-- transfer_referral(): only record a "transfer_update" medication-history row when
-- the medication ACTUALLY changed during the transfer.
--
-- Bug (patient Don, 2026-06-17): the client sends the current medication as
-- p_updated_medication_on_transfer even when the doctor didn't change it. The old
-- body logged a transfer_update whenever the value was non-null, producing a
-- misleading "Updated During Transfer" step that showed no real change.
--
-- This recreates the function verbatim and only tightens the logging condition
-- (adds the IS DISTINCT FROM guard). The idempotency guard is preserved.

CREATE OR REPLACE FUNCTION public.transfer_referral(
  p_original_referral_id uuid,
  p_new_to_user_id uuid,
  p_new_to_department text,
  p_transfer_reason text,
  p_transfer_notes text DEFAULT NULL::text,
  p_transferred_by_user_id uuid DEFAULT NULL::uuid,
  p_updated_medication_on_transfer text DEFAULT NULL::text
)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
DECLARE
  source_ref referrals%ROWTYPE;
  new_ref_id UUID;
  from_dept TEXT;
BEGIN
  -- Get original referral data
  SELECT * INTO source_ref FROM referrals WHERE id = p_original_referral_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Referral not found'; END IF;

  -- IDEMPOTENCY GUARD: a referral can only be transferred once.
  IF source_ref.status = 'Transferred' THEN
    RAISE EXCEPTION 'Referral % has already been transferred', p_original_referral_id
      USING ERRCODE = '23505';
  END IF;

  -- Get transferring user's department
  SELECT department INTO from_dept FROM users WHERE id = p_transferred_by_user_id;

  -- Generate new ID
  new_ref_id := gen_random_uuid();

  -- Create new referral with COMPLETE patient data and PROPER transfer_parent_id
  INSERT INTO referrals (
    id, title, description, urgency, status, from_user_id, to_department, to_user_id, created_at,
    patient_name, patient_age, patient_sex, admission_date, patient_admission_time,
    room_no, patient_ip_no, past_history, general_examination,
    medication_given, initial_medication,
    transfer_parent_id, transfer_reason, transfer_notes, transferred_from_user_id,
    transferred_from_department, transferred_at, from_department
  ) VALUES (
    new_ref_id, source_ref.title, source_ref.description, source_ref.urgency, 'Received',
    p_transferred_by_user_id, p_new_to_department, p_new_to_user_id, NOW(),
    source_ref.patient_name, source_ref.patient_age, source_ref.patient_sex,
    source_ref.admission_date, source_ref.patient_admission_time,
    source_ref.room_no, source_ref.patient_ip_no, source_ref.past_history, source_ref.general_examination,
    COALESCE(p_updated_medication_on_transfer, source_ref.medication_given), source_ref.initial_medication,
    p_original_referral_id, p_transfer_reason, p_transfer_notes, p_transferred_by_user_id,
    from_dept, NOW(), from_dept
  );

  -- Update original referral
  UPDATE referrals SET status = 'Transferred', updated_at = NOW(), transferred_at = NOW()
  WHERE id = p_original_referral_id;

  -- Log medication update ONLY if the medication actually changed during transfer.
  IF p_updated_medication_on_transfer IS NOT NULL
     AND p_updated_medication_on_transfer IS DISTINCT FROM source_ref.medication_given THEN
    INSERT INTO medication_history (referral_id, medication_text, update_type, updated_by, notes)
    VALUES (p_original_referral_id, p_updated_medication_on_transfer, 'transfer_update', p_transferred_by_user_id, 'Medication updated during transfer.');
  END IF;

  RETURN new_ref_id;
END;
$function$;
