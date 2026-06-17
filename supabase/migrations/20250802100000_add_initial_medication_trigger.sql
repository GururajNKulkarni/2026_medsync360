-- Create trigger to automatically record initial medication in history when referral is created
CREATE OR REPLACE FUNCTION record_initial_medication()
RETURNS TRIGGER AS $$
BEGIN
  -- Only record if medication_given is not empty
  IF NEW.medication_given IS NOT NULL AND NEW.medication_given != '' THEN
    INSERT INTO medication_history (
      referral_id,
      medication_text,
      update_type,
      updated_by,
      updated_at,
      notes
    ) VALUES (
      NEW.id,
      NEW.medication_given,
      'initial',
      NEW.from_user_id,
      NEW.created_at,
      'Initial medication at referral creation'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on referrals table
DROP TRIGGER IF EXISTS trigger_record_initial_medication ON referrals;
CREATE TRIGGER trigger_record_initial_medication
  AFTER INSERT ON referrals
  FOR EACH ROW
  EXECUTE FUNCTION record_initial_medication();

-- Add any existing referrals that don't have initial medication history
INSERT INTO medication_history (referral_id, medication_text, update_type, updated_at, updated_by, notes)
SELECT 
  r.id as referral_id,
  r.medication_given as medication_text,
  'initial' as update_type,
  r.created_at as updated_at,
  r.from_user_id as updated_by,
  'Initial medication (retroactively added)' as notes
FROM referrals r
WHERE r.medication_given IS NOT NULL 
  AND r.medication_given != ''
  AND NOT EXISTS (
    SELECT 1 FROM medication_history mh 
    WHERE mh.referral_id = r.id 
    AND mh.update_type = 'initial'
  );