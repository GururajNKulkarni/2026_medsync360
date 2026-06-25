-- Hospital-scoped referral analytics (MULTI_TENANT_PLAN step 9). Aggregates
-- live in a SECURITY DEFINER function so the dashboard can summarise ALL of a
-- hospital's referrals regardless of the per-department row RLS on `referrals`,
-- while still scoping to the caller's own hospital. Platform Owner sees the
-- whole network. A referral belongs to a hospital via its creator (from_user).
CREATE OR REPLACE FUNCTION public.get_referral_analytics(
  p_from date DEFAULT (now() - interval '12 months')::date,
  p_to   date DEFAULT now()::date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  is_platform boolean := current_app_role() = 'platform';
  my_hosp uuid := current_hospital_id();
  result jsonb;
BEGIN
  WITH scoped AS (
    SELECT r.*
    FROM referrals r
    WHERE r.created_at::date BETWEEN p_from AND p_to
      AND (
        is_platform
        OR EXISTS (
          SELECT 1 FROM users u
          WHERE u.id = r.from_user_id AND u.hospital_id = my_hosp
        )
      )
  )
  SELECT jsonb_build_object(
    'totals', jsonb_build_object(
      'total', (SELECT count(*) FROM scoped),
      'closed', (SELECT count(*) FROM scoped WHERE status = 'Closed'),
      'transferred', (SELECT count(*) FROM scoped WHERE status = 'Transferred'),
      'cancelled', (SELECT count(*) FROM scoped WHERE status = 'Cancelled'),
      'in_progress', (SELECT count(*) FROM scoped WHERE status IN ('Sent','Received','Acknowledged','Accepted'))
    ),
    'avg_days_to_close', (
      SELECT round(avg(EXTRACT(EPOCH FROM (end_time - created_at)) / 86400)::numeric, 1)
      FROM scoped WHERE status = 'Closed' AND end_time IS NOT NULL
    ),
    'transfer_rate', (
      SELECT CASE WHEN count(*) = 0 THEN 0
        ELSE round(100.0 * count(*) FILTER (WHERE status = 'Transferred') / count(*), 1) END
      FROM scoped
    ),
    'by_status', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('status', status, 'count', c) ORDER BY c DESC)
      FROM (SELECT status::text AS status, count(*) AS c FROM scoped GROUP BY status) t
    ), '[]'::jsonb),
    'by_department', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('department', department, 'count', c) ORDER BY c DESC)
      FROM (SELECT to_department AS department, count(*) AS c FROM scoped WHERE to_department IS NOT NULL GROUP BY to_department) t
    ), '[]'::jsonb),
    'by_urgency', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('urgency', urgency, 'count', c) ORDER BY c DESC)
      FROM (SELECT urgency::text AS urgency, count(*) AS c FROM scoped GROUP BY urgency) t
    ), '[]'::jsonb),
    'over_time', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('month', month, 'count', c, 'closed', closed) ORDER BY month)
      FROM (
        SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
               count(*) AS c,
               count(*) FILTER (WHERE status = 'Closed') AS closed
        FROM scoped GROUP BY 1
      ) t
    ), '[]'::jsonb),
    'top_diagnoses', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('category', category, 'count', c) ORDER BY c DESC)
      FROM (
        SELECT final_diagnosis_category AS category, count(*) AS c
        FROM scoped WHERE final_diagnosis_category IS NOT NULL AND final_diagnosis_category <> ''
        GROUP BY final_diagnosis_category ORDER BY count(*) DESC LIMIT 8
      ) t
    ), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;
-- Analytics is an authenticated dashboard call; anon has no business invoking it.
REVOKE EXECUTE ON FUNCTION public.get_referral_analytics(date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_referral_analytics(date, date) TO authenticated;
