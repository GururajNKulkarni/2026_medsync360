-- get_referral_transfer_history walks the transfer chain via `referrals`, so as
-- SECURITY INVOKER it is truncated by RLS for a downstream viewer (same root cause
-- as 20260617150000 for the medication trail). Make it SECURITY DEFINER with the
-- same authorization guard so any authorized viewer sees the full transfer history.
-- Verbatim recreation of the existing body + guard.

CREATE OR REPLACE FUNCTION public.get_referral_transfer_history(p_referral_id uuid)
 RETURNS TABLE(referral_id uuid, from_doctor text, from_department text, to_doctor text, to_department text, transfer_reason text, transfer_notes text, transferred_at timestamp with time zone, is_original boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM referrals r
      WHERE r.id = p_referral_id
        AND (
          r.from_user_id = auth.uid()
          OR r.to_user_id = auth.uid()
          OR r.to_department IN (SELECT u.department FROM users u WHERE u.id = auth.uid())
        )
  ) THEN
      RETURN;
  END IF;

  RETURN QUERY
  WITH RECURSIVE transfer_chain AS (
    SELECT
      r.id, r.transfer_parent_id, r.from_user_id, r.created_at,
      r.transfer_reason, r.transfer_notes, r.transferred_at,
      r.transferred_from_user_id, r.to_user_id, r.to_department, 1 as level
    FROM referrals r
    WHERE r.id = p_referral_id

    UNION ALL

    SELECT
      r.id, r.transfer_parent_id, r.from_user_id, r.created_at,
      r.transfer_reason, r.transfer_notes, r.transferred_at,
      r.transferred_from_user_id, r.to_user_id, r.to_department, tc.level + 1
    FROM referrals r
    JOIN transfer_chain tc ON r.id = tc.transfer_parent_id
  )
  SELECT
    tc.id,
    COALESCE(from_user.full_name, original_sender.full_name) as from_doctor,
    COALESCE(from_user.department, original_sender.department) as from_department,
    to_user.full_name as to_doctor,
    tc.to_department,
    tc.transfer_reason,
    tc.transfer_notes,
    COALESCE(tc.transferred_at, tc.created_at) as transferred_at,
    (tc.transfer_parent_id IS NULL) as is_original
  FROM transfer_chain tc
  LEFT JOIN users to_user ON tc.to_user_id = to_user.id
  LEFT JOIN users from_user ON tc.transferred_from_user_id = from_user.id
  LEFT JOIN users original_sender ON tc.from_user_id = original_sender.id
  ORDER BY tc.level DESC, COALESCE(tc.transferred_at, tc.created_at) ASC;
END;
$function$;
