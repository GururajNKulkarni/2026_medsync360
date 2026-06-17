-- Backfill missing patient data in existing transferred referrals
UPDATE referrals AS transferred
SET 
  room_no = COALESCE(transferred.room_no, original.room_no),
  patient_ip_no = COALESCE(transferred.patient_ip_no, original.patient_ip_no),
  patient_admission_time = COALESCE(transferred.patient_admission_time, original.patient_admission_time),
  past_history = COALESCE(transferred.past_history, original.past_history),
  general_examination = COALESCE(transferred.general_examination, original.general_examination)
FROM referrals AS original
WHERE transferred.transfer_parent_id = original.id
  AND (
    transferred.room_no IS NULL OR 
    transferred.patient_ip_no IS NULL OR 
    transferred.patient_admission_time IS NULL OR 
    transferred.past_history IS NULL OR 
    transferred.general_examination IS NULL
  );