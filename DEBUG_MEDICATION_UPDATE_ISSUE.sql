-- 🔍 DEBUG MEDICATION UPDATE ISSUE
-- Investigating why medication updates are not being saved

-- 1. Check current referral medication status
SELECT 'CURRENT REFERRAL STATUS' as check_type;
SELECT 
  id,
  patient_name,
  medication_given,
  last_medication_update,
  medication_update_count,
  status,
  updated_at
FROM referrals 
WHERE patient_name = 'Lakshmi'
ORDER BY updated_at DESC;

-- 2. Check if medication_history has any records for this referral
SELECT 'MEDICATION HISTORY CHECK' as check_type;
SELECT 
  mh.referral_id,
  mh.medication_text,
  mh.update_type,
  mh.notes,
  mh.updated_at,
  mh.previous_medication,
  u.full_name as updated_by_name
FROM medication_history mh
LEFT JOIN users u ON mh.updated_by = u.id
WHERE mh.referral_id IN (
  SELECT id FROM referrals WHERE patient_name = 'Lakshmi'
)
ORDER BY mh.updated_at DESC;

-- 3. Test medication summary function for this referral
SELECT 'MEDICATION SUMMARY TEST' as check_type;
SELECT * FROM get_medication_summary(
  (SELECT id FROM referrals WHERE patient_name = 'Lakshmi' LIMIT 1)
);

-- 4. Check if the medication tracking functions exist
SELECT 'FUNCTION EXISTENCE CHECK' as check_type;
SELECT 
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines 
WHERE routine_name IN ('track_medication_update', 'get_medication_summary', 'get_medication_timeline')
ORDER BY routine_name;

-- 5. Test manual medication tracking
SELECT 'MANUAL MEDICATION TRACKING TEST' as check_type;
SELECT track_medication_update(
  (SELECT id FROM referrals WHERE patient_name = 'Lakshmi' LIMIT 1),
  'test for update medication - manual test',
  'completion_update',
  'Manual test to check if tracking works',
  (SELECT id FROM users WHERE metadata->>'kmc_number' = 'KMC090877' LIMIT 1)
);

-- 6. Check if the update worked
SELECT 'POST-UPDATE CHECK' as check_type;
SELECT 
  id,
  patient_name,
  medication_given,
  last_medication_update,
  medication_update_count
FROM referrals 
WHERE patient_name = 'Lakshmi';

-- 7. Check medication history after manual update
SELECT 'HISTORY AFTER MANUAL UPDATE' as check_type;
SELECT 
  medication_text,
  update_type,
  updated_at,
  previous_medication
FROM medication_history 
WHERE referral_id = (SELECT id FROM referrals WHERE patient_name = 'Lakshmi' LIMIT 1)
ORDER BY updated_at DESC;

SELECT 'DIAGNOSIS: Checking if medication updates are being saved correctly' as status;
