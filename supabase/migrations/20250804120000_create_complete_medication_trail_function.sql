-- Create function to get complete medication trail across transfer chain
CREATE OR REPLACE FUNCTION get_complete_medication_trail(p_referral_id UUID)
RETURNS TABLE (
  step_number INTEGER,
  timestamp TIMESTAMPTZ,
  formatted_time TEXT,
  doctor_name TEXT,
  doctor_id UUID,
  action_type TEXT,
  department_context TEXT,
  medication_prescribed TEXT,
  medication_context TEXT,
  referral_id UUID,
  referral_title TEXT,
  is_original_referral BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE transfer_chain AS (
    -- Start with the target referral
    SELECT 
      r.id,
      r.transfer_parent_id,
      1 as level,
      ARRAY[r.id] as path
    FROM referrals r
    WHERE r.id = p_referral_id
    
    UNION ALL
    
    -- Recursively find parent referrals
    SELECT 
      r.id,
      r.transfer_parent_id,
      tc.level + 1,
      tc.path || r.id
    FROM referrals r
    INNER JOIN transfer_chain tc ON r.id = tc.transfer_parent_id
  ),
  all_referrals_in_chain AS (
    SELECT DISTINCT unnest(path) as referral_id
    FROM transfer_chain
  )
  SELECT 
    ROW_NUMBER() OVER (ORDER BY r.created_at, mh.updated_at)::INTEGER as step_number,
    
    -- Timeline
    mh.updated_at as timestamp,
    TO_CHAR(mh.updated_at, 'Mon DD, YYYY at HH24:MI') as formatted_time,
    
    -- Doctor and Action
    umu.full_name as doctor_name,
    umu.id as doctor_id,
    CASE 
      WHEN mh.update_type = 'initial' THEN 'Created Referral'
      WHEN mh.update_type = 'transfer_update' THEN 'Updated During Transfer'
      WHEN mh.update_type = 'completion_update' THEN 'Completed Referral'
      ELSE mh.update_type
    END as action_type,
    
    -- Department Context
    CASE 
      WHEN mh.update_type = 'initial' THEN COALESCE(r.from_department, 'Unknown Department')
      WHEN mh.update_type = 'transfer_update' THEN COALESCE(r.to_department, 'Unknown Department') || ' (receiving transfer)'
      WHEN mh.update_type = 'completion_update' THEN COALESCE(r.to_department, 'Unknown Department') || ' (completing)'
      ELSE COALESCE(r.to_department, 'Unknown Department')
    END as department_context,
    
    -- Medication
    mh.medication_text as medication_prescribed,
    
    -- Context
    CASE 
      WHEN mh.update_type = 'initial' THEN 'Original prescription by ' || umu.full_name
      WHEN mh.update_type = 'transfer_update' THEN 'Updated medication during transfer to ' || COALESCE(r.to_department, 'Unknown Department')
      WHEN mh.update_type = 'completion_update' THEN 'Final medication update by ' || umu.full_name
      ELSE COALESCE(mh.notes, 'No additional notes')
    END as medication_context,
    
    -- Referral info
    r.id as referral_id,
    r.title as referral_title,
    (r.transfer_parent_id IS NULL) as is_original_referral
    
  FROM all_referrals_in_chain arc
  JOIN referrals r ON arc.referral_id = r.id
  JOIN medication_history mh ON r.id = mh.referral_id
  LEFT JOIN users umu ON mh.updated_by = umu.id
  
  ORDER BY mh.updated_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;