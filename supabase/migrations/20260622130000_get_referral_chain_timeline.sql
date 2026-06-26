-- Per-stage referral timeline for the completion report.
-- The report's "Referral Path" and "Timeline" sections only showed the LAST hop
-- (this leaf's from/to) and a single accept time. For a transferred referral that
-- hides every upstream doctor. This RPC returns one row per chain node (stage)
-- with that stage's holder + received / accepted / transferred / ended times, so
-- the report can show the full doctor path and a per-stage timeline.
--
-- SECURITY DEFINER + auth guard + pinned search_path: a downstream doctor cannot
-- read upstream chain nodes under the normal referrals RLS policy (different
-- department / not a party), so the trail would otherwise truncate.
-- See memory: chain-walking-rpcs-need-security-definer.

CREATE OR REPLACE FUNCTION public.get_referral_chain_timeline(p_referral_id uuid)
RETURNS TABLE(
  hop_level integer,
  referral_id uuid,
  from_doctor text,
  from_department text,
  to_doctor text,
  to_department text,
  received_at timestamptz,
  accepted_at timestamptz,
  transferred_at timestamptz,
  ended_at timestamptz,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
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
  WITH RECURSIVE up AS (
    -- Walk UP to the chain root (cycle-guarded).
    SELECT r.id, r.transfer_parent_id, ARRAY[r.id] AS path
    FROM referrals r WHERE r.id = p_referral_id
    UNION ALL
    SELECT r.id, r.transfer_parent_id, up.path || r.id
    FROM referrals r INNER JOIN up ON r.id = up.transfer_parent_id
    WHERE r.id <> ALL(up.path)
  ),
  root AS (SELECT up.id FROM up WHERE up.transfer_parent_id IS NULL LIMIT 1),
  chain AS (
    -- Walk DOWN from the root collecting hop levels (0 = origin), cycle-guarded.
    SELECT r.id, r.transfer_parent_id, 0 AS hop, ARRAY[r.id] AS path
    FROM referrals r WHERE r.id = (SELECT root.id FROM root)
    UNION ALL
    SELECT r.id, r.transfer_parent_id, c.hop + 1, c.path || r.id
    FROM referrals r INNER JOIN chain c ON r.transfer_parent_id = c.id
    WHERE r.id <> ALL(c.path)
  )
  SELECT
    c.hop,
    r.id,
    fu.full_name,
    r.from_department,
    tu.full_name,
    r.to_department,
    r.created_at,
    r.start_time,
    r.transferred_at,
    r.end_time,
    r.status::text
  FROM chain c
  JOIN referrals r ON r.id = c.id
  LEFT JOIN users fu ON r.from_user_id = fu.id
  LEFT JOIN users tu ON r.to_user_id = tu.id
  ORDER BY c.hop ASC;
END;
$function$;
