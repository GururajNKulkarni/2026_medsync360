-- Referrals predate the multi-tenant model and were never hospital-scoped:
-- (1) any doctor could INSERT a referral addressed to a doctor in ANY
--     hospital (only from_user_id = auth.uid() was checked), and
-- (2) the "read referrals to their department" SELECT policy matched on the
--     bare department NAME, so a doctor at a different hospital with the same
--     department string could read referrals never addressed to them.
-- Scope both to the same hospital, mirroring the duty_roster fix. to_user_id
-- is nullable (one legacy row), so NULL targets are left unrestricted rather
-- than blocked.

-- INSERT ---------------------------------------------------------------
DROP POLICY IF EXISTS "Users can create referrals" ON referrals;

CREATE POLICY "referrals_insert_same_hospital"
ON referrals
FOR INSERT
TO authenticated
WITH CHECK (
  from_user_id = auth.uid()
  AND (
    to_user_id IS NULL
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = to_user_id
        AND u.hospital_id = current_hospital_id()
    )
  )
);

-- SELECT (department-wide visibility) --------------------------------------
DROP POLICY IF EXISTS "Users can read referrals to their department" ON referrals;

CREATE POLICY "referrals_select_same_hospital_department"
ON referrals
FOR SELECT
TO authenticated
USING (
  to_department IN (SELECT department FROM users WHERE id = auth.uid())
  AND (
    to_user_id IS NULL
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = to_user_id
        AND u.hospital_id = current_hospital_id()
    )
  )
);

-- transfer_referral(): block transferring to a doctor in a different
-- hospital. Everything else about the function is unchanged.
CREATE OR REPLACE FUNCTION public.transfer_referral(p_original_referral_id uuid, p_new_to_user_id uuid, p_new_to_department text, p_transfer_reason text, p_transfer_notes text DEFAULT NULL::text, p_transferred_by_user_id uuid DEFAULT NULL::uuid, p_updated_medication_on_transfer text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
DECLARE
  source_ref referrals%ROWTYPE;
  new_ref_id UUID;
  from_dept TEXT;
  from_hosp UUID;
  to_hosp UUID;
BEGIN
  -- Get original referral data
  SELECT * INTO source_ref FROM referrals WHERE id = p_original_referral_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Referral not found'; END IF;

  -- IDEMPOTENCY GUARD: a referral can only be transferred once.
  IF source_ref.status = 'Transferred' THEN
    RAISE EXCEPTION 'Referral % has already been transferred', p_original_referral_id
      USING ERRCODE = '23505';
  END IF;

  -- Get transferring user's department and hospital
  SELECT department, hospital_id INTO from_dept, from_hosp FROM users WHERE id = p_transferred_by_user_id;

  -- Block cross-hospital transfers.
  IF p_new_to_user_id IS NOT NULL THEN
    SELECT hospital_id INTO to_hosp FROM users WHERE id = p_new_to_user_id;
    IF to_hosp IS DISTINCT FROM from_hosp THEN
      RAISE EXCEPTION 'Cannot transfer referral to a doctor outside your hospital';
    END IF;
  END IF;

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
  -- Passing the unchanged current medication must NOT create a misleading
  -- "Updated During Transfer" step (see patient Don investigation, 2026-06-17).
  IF p_updated_medication_on_transfer IS NOT NULL
     AND p_updated_medication_on_transfer IS DISTINCT FROM source_ref.medication_given THEN
    INSERT INTO medication_history (referral_id, medication_text, update_type, updated_by, notes)
    VALUES (p_original_referral_id, p_updated_medication_on_transfer, 'transfer_update', p_transferred_by_user_id, 'Medication updated during transfer.');
  END IF;

  RETURN new_ref_id;
END;
$function$;
