-- Migration: Fix from_department constraints and prevent future NULL values
-- Date: 2025-08-06

-- Step 1: Update existing records with NULL from_department
-- This will populate from_department based on the user's department
UPDATE referrals 
SET from_department = u.department
FROM users u
WHERE referrals.from_user_id = u.id 
  AND referrals.from_department IS NULL;

-- Step 2: Add NOT NULL constraint to from_department
ALTER TABLE referrals 
ALTER COLUMN from_department SET NOT NULL;

-- Step 3: Add check constraint to ensure from_department is not empty
ALTER TABLE referrals 
ADD CONSTRAINT check_from_department_not_empty 
CHECK (from_department IS NOT NULL AND from_department != '');

-- Step 4: Add check constraint to ensure from_user_id is not NULL when from_department is set
ALTER TABLE referrals 
ADD CONSTRAINT check_from_user_department_consistency 
CHECK (from_user_id IS NOT NULL);

-- Step 5: Create a function to automatically populate from_department during referral creation
CREATE OR REPLACE FUNCTION auto_populate_from_department()
RETURNS TRIGGER AS $$
BEGIN
  -- If from_department is not set, populate it from the user's department
  IF NEW.from_department IS NULL OR NEW.from_department = '' THEN
    SELECT department INTO NEW.from_department
    FROM users
    WHERE id = NEW.from_user_id;
    
    -- If still NULL, raise an error
    IF NEW.from_department IS NULL THEN
      RAISE EXCEPTION 'Cannot create referral: from_user_id % does not have a department assigned', NEW.from_user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create trigger to automatically populate from_department
DROP TRIGGER IF EXISTS trigger_auto_populate_from_department ON referrals;
CREATE TRIGGER trigger_auto_populate_from_department
  BEFORE INSERT OR UPDATE ON referrals
  FOR EACH ROW
  EXECUTE FUNCTION auto_populate_from_department();

-- Step 7: Update the create_referral function to ensure from_department is always set
CREATE OR REPLACE FUNCTION create_referral(
  p_patient_name TEXT,
  p_patient_age INTEGER,
  p_patient_sex TEXT,
  p_admission_date DATE,
  p_patient_admission_time TIME,
  p_room_no TEXT,
  p_patient_ip_no TEXT,
  p_chief_complaint TEXT,
  p_past_history TEXT,
  p_general_examination TEXT,
  p_medication_given TEXT,
  p_urgency TEXT,
  p_to_department TEXT,
  p_from_user_id UUID,
  p_to_user_id UUID,
  p_attachments TEXT[] DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_referral_id UUID;
  v_from_department TEXT;
BEGIN
  -- Get the from_department from the user's department
  SELECT department INTO v_from_department
  FROM users
  WHERE id = p_from_user_id;
  
  -- Validate that the user has a department
  IF v_from_department IS NULL THEN
    RAISE EXCEPTION 'Cannot create referral: user % does not have a department assigned', p_from_user_id;
  END IF;
  
  -- Create the referral with the correct from_department
  INSERT INTO referrals (
    patient_name,
    patient_age,
    patient_sex,
    admission_date,
    patient_admission_time,
    room_no,
    patient_ip_no,
    chief_complaint,
    past_history,
    general_examination,
    medication_given,
    urgency,
    from_department,
    to_department,
    from_user_id,
    to_user_id,
    status,
    created_at
  ) VALUES (
    p_patient_name,
    p_patient_age,
    p_patient_sex,
    p_admission_date,
    p_patient_admission_time,
    p_room_no,
    p_patient_ip_no,
    p_chief_complaint,
    p_past_history,
    p_general_examination,
    p_medication_given,
    p_urgency,
    v_from_department,  -- Use the user's department
    p_to_department,
    p_from_user_id,
    p_to_user_id,
    'Sent',
    NOW()
  ) RETURNING id INTO v_referral_id;
  
  -- Add initial medication history entry
  INSERT INTO medication_history (
    referral_id,
    medication_text,
    update_type,
    updated_by,
    notes
  ) VALUES (
    v_referral_id,
    p_medication_given,
    'initial',
    p_from_user_id,
    'Initial medication at referral creation'
  );
  
  RETURN v_referral_id;
END;
$$ LANGUAGE plpgsql; 