-- BULLETPROOF MEDICATION SYSTEM TEST
-- Testing referral: fcae1cf8-5d25-4444-8ea4-3ef6ed2f680d

-- 1. Check the basic referral data
SELECT 
  id,
  patient_name,
  status,
  medication_given as current_medication,
  initial_medication,
  created_at,
  end_time,
  last_medication_update,
  medication_update_count
FROM referrals 
WHERE id = 'fcae1cf8-5d25-4444-8ea4-3ef6ed2f680d';

-- 2. Check complete medication history for this referral
SELECT 
  id,
  referral_id,
  medication_text,
  update_type,
  updated_by,
  updated_at,
  notes,
  created_at
FROM medication_history 
WHERE referral_id = 'fcae1cf8-5d25-4444-8ea4-3ef6ed2f680d'
ORDER BY updated_at ASC;

-- 3. Test our medication timeline function
SELECT * FROM get_medication_timeline('fcae1cf8-5d25-4444-8ea4-3ef6ed2f680d');

-- 4. Check if initial medication was properly set by trigger
SELECT 
  r.id,
  r.initial_medication,
  r.medication_given,
  r.created_at,
  mh.medication_text as history_initial,
  mh.update_type,
  mh.updated_at as history_created
FROM referrals r
LEFT JOIN medication_history mh ON r.id = mh.referral_id AND mh.update_type = 'initial'
WHERE r.id = 'fcae1cf8-5d25-4444-8ea4-3ef6ed2f680d';

-- 5. Verify data consistency - initial_medication should match 'initial' type in history
SELECT 
  CASE 
    WHEN r.initial_medication = mh.medication_text THEN 'CONSISTENT ✓'
    WHEN r.initial_medication IS NULL AND mh.medication_text IS NULL THEN 'BOTH NULL ✓'
    ELSE 'INCONSISTENT ✗ - NEEDS FIX'
  END as data_consistency_check,
  r.initial_medication as referral_initial,
  mh.medication_text as history_initial
FROM referrals r
LEFT JOIN medication_history mh ON r.id = mh.referral_id AND mh.update_type = 'initial'
WHERE r.id = 'fcae1cf8-5d25-4444-8ea4-3ef6ed2f680d';

-- 6. Check transfer history (if this referral was transferred)
SELECT * FROM get_referral_transfer_history('fcae1cf8-5d25-4444-8ea4-3ef6ed2f680d');

-- 7. Check if there are any attachments
SELECT 
  ra.id,
  ra.referral_id,
  ra.file_name,
  ra.original_file_name,
  ra.file_type,
  ra.uploaded_by,
  ra.created_at
FROM referral_attachments ra
WHERE ra.referral_id = 'fcae1cf8-5d25-4444-8ea4-3ef6ed2f680d';

-- 8. Test medication change tracking - count all medication updates
SELECT 
  COUNT(*) as total_medication_updates,
  COUNT(CASE WHEN update_type = 'initial' THEN 1 END) as initial_count,
  COUNT(CASE WHEN update_type = 'completion_update' THEN 1 END) as completion_count,
  COUNT(CASE WHEN update_type = 'transfer_update' THEN 1 END) as transfer_count,
  COUNT(CASE WHEN update_type = 'manual_update' THEN 1 END) as manual_count
FROM medication_history 
WHERE referral_id = 'fcae1cf8-5d25-4444-8ea4-3ef6ed2f680d';

-- 9. Verify referral status progression makes sense
SELECT 
  r.id,
  r.status,
  r.created_at,
  r.start_time,
  r.end_time,
  CASE 
    WHEN r.status = 'Closed' AND r.end_time IS NULL THEN 'INCONSISTENT ✗ - Closed but no end_time'
    WHEN r.status != 'Closed' AND r.end_time IS NOT NULL THEN 'INCONSISTENT ✗ - Has end_time but not closed'
    ELSE 'CONSISTENT ✓'
  END as status_consistency
FROM referrals r
WHERE r.id = 'fcae1cf8-5d25-4444-8ea4-3ef6ed2f680d';

-- 10. Check user permissions and relationships
SELECT 
  r.id,
  r.from_user_id,
  fu.full_name as from_user_name,
  fu.department as from_department,
  r.to_user_id,
  tu.full_name as to_user_name,
  tu.department as to_department,
  r.status
FROM referrals r
LEFT JOIN users fu ON r.from_user_id = fu.id
LEFT JOIN users tu ON r.to_user_id = tu.id
WHERE r.id = 'fcae1cf8-5d25-4444-8ea4-3ef6ed2f680d';

-- 11. FINAL REPORT SIMULATION - What would the Excel export look like?
WITH medication_data AS (
  SELECT 
    r.id,
    r.patient_name,
    r.status,
    r.initial_medication,
    r.medication_given as current_medication,
    -- Get first medication from history
    (SELECT mh.medication_text 
     FROM medication_history mh 
     WHERE mh.referral_id = r.id AND mh.update_type = 'initial'
     ORDER BY mh.updated_at ASC 
     LIMIT 1) as history_initial,
    -- Get last medication from history
    (SELECT mh.medication_text 
     FROM medication_history mh 
     WHERE mh.referral_id = r.id 
     ORDER BY mh.updated_at DESC 
     LIMIT 1) as history_final
  FROM referrals r
  WHERE r.id = 'fcae1cf8-5d25-4444-8ea4-3ef6ed2f680d'
)
SELECT 
  *,
  CASE 
    WHEN COALESCE(initial_medication, history_initial) = COALESCE(current_medication, history_final) THEN 'No'
    ELSE 'Yes'
  END as medication_changed_flag,
  'Initial: ' || COALESCE(initial_medication, history_initial, 'None') as excel_initial,
  'Final: ' || COALESCE(current_medication, history_final, 'None') as excel_final
FROM medication_data;