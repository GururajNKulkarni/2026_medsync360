CREATE OR REPLACE FUNCTION get_referral_transfer_history(p_referral_id UUID)
RETURNS TABLE (
  referral_id UUID,
  from_doctor TEXT,
  from_department TEXT,
  to_doctor TEXT,
  to_department TEXT,
  transfer_reason TEXT,
  transfer_notes TEXT,
  transferred_at TIMESTAMPTZ,
  is_original BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE transfer_chain AS (
    -- Anchor member: Starts with the referral ID provided
    SELECT 
      r.id,
      r.transfer_parent_id,
      r.from_user_id,
      r.created_at,
      r.transfer_reason,
      r.transfer_notes,
      r.transferred_at,
      r.transferred_from_user_id,
      r.to_user_id,
      r.to_department,
      1 as level
    FROM referrals r
    WHERE r.id = p_referral_id

    UNION ALL

    -- Recursive member: Joins to the parent referral
    SELECT 
      r.id,
      r.transfer_parent_id,
      r.from_user_id,
      r.created_at,
      r.transfer_reason,
      r.transfer_notes,
      r.transferred_at,
      r.transferred_from_user_id,
      r.to_user_id,
      r.to_department,
      tc.level + 1
    FROM referrals r
    JOIN transfer_chain tc ON r.id = tc.transfer_parent_id
  )
  -- Final select and join with users to get names
  SELECT 
    tc.id,
    -- If transferred_from_user_id is null, it's the original sender
    COALESCE(from_user.full_name, original_sender.full_name) as from_doctor,
    COALESCE(from_user.department, original_sender.department) as from_department,
    to_user.full_name as to_doctor,
    tc.to_department,
    tc.transfer_reason,
    tc.transfer_notes,
    -- If transferred_at is null, it's the creation event
    COALESCE(tc.transferred_at, tc.created_at) as transferred_at,
    (tc.transfer_parent_id IS NULL) as is_original
  FROM transfer_chain tc
  LEFT JOIN users to_user ON tc.to_user_id = to_user.id
  LEFT JOIN users from_user ON tc.transferred_from_user_id = from_user.id
  LEFT JOIN users original_sender ON tc.from_user_id = original_sender.id
  ORDER BY tc.level DESC, COALESCE(tc.transferred_at, tc.created_at) ASC;
END;
$$ LANGUAGE plpgsql;
