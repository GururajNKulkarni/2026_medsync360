-- Operational analytics for the superuser/owner pitch. Adds time-to-accept
-- (overall + by dept), decline rate + reasons, transfer hotspots, per-dept
-- workload (sent vs received), lifecycle by dept, and inter-department Sankey
-- flow. Role scope unchanged (platform=network, superuser=hospital, doctor=own).
-- Single-CTE pattern (no temp table). Supersedes 20260624210000.
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
  me uuid := auth.uid();
  my_role text := current_app_role();
  my_hosp uuid := current_hospital_id();
  result jsonb;
BEGIN
  WITH scoped AS (
    SELECT r.*
    FROM referrals r
    WHERE r.created_at::date BETWEEN p_from AND p_to
      AND (
        my_role = 'platform'
        OR (my_role = 'superuser' AND EXISTS (
              SELECT 1 FROM users u WHERE u.id = r.from_user_id AND u.hospital_id = my_hosp))
        OR r.from_user_id = me
        OR r.to_user_id = me
      )
  )
  SELECT jsonb_build_object(
    'totals', jsonb_build_object(
      'total', (SELECT count(*) FROM scoped),
      'closed', (SELECT count(*) FROM scoped WHERE status='Closed'),
      'transferred', (SELECT count(*) FROM scoped WHERE status='Transferred'),
      'cancelled', (SELECT count(*) FROM scoped WHERE status='Cancelled'),
      'in_progress', (SELECT count(*) FROM scoped WHERE status IN ('Sent','Received','Acknowledged','Accepted'))
    ),
    'avg_days_to_close', (SELECT round(avg(EXTRACT(EPOCH FROM (end_time-created_at))/86400)::numeric,1)
      FROM scoped WHERE status='Closed' AND end_time IS NOT NULL),
    'avg_hours_to_accept', (SELECT round(avg(EXTRACT(EPOCH FROM (start_time-created_at))/3600)::numeric,1)
      FROM scoped WHERE start_time IS NOT NULL AND start_time > created_at),
    'transfer_rate', (SELECT CASE WHEN count(*)=0 THEN 0 ELSE round(100.0*count(*) FILTER (WHERE status='Transferred')/count(*),1) END FROM scoped),
    'decline_rate', (SELECT CASE WHEN count(*)=0 THEN 0 ELSE round(100.0*count(*) FILTER (WHERE status='Cancelled')/count(*),1) END FROM scoped),
    'by_status', COALESCE((SELECT jsonb_agg(jsonb_build_object('status',status,'count',c) ORDER BY c DESC)
      FROM (SELECT status::text AS status, count(*) AS c FROM scoped GROUP BY status) t), '[]'::jsonb),
    'by_urgency', COALESCE((SELECT jsonb_agg(jsonb_build_object('urgency',urgency,'count',c) ORDER BY c DESC)
      FROM (SELECT urgency::text AS urgency, count(*) AS c FROM scoped GROUP BY urgency) t), '[]'::jsonb),
    'over_time', COALESCE((SELECT jsonb_agg(jsonb_build_object('month',month,'count',c,'closed',closed) ORDER BY month)
      FROM (SELECT to_char(date_trunc('month',created_at),'YYYY-MM') AS month, count(*) AS c,
                   count(*) FILTER (WHERE status='Closed') AS closed FROM scoped GROUP BY 1) t), '[]'::jsonb),
    'dept_flow', COALESCE((SELECT jsonb_agg(jsonb_build_object('department',d,'sent',sent,'received',received) ORDER BY (sent+received) DESC)
      FROM (SELECT d.department AS d,
                   (SELECT count(*) FROM scoped WHERE from_department=d.department) AS sent,
                   (SELECT count(*) FROM scoped WHERE to_department=d.department) AS received
            FROM (SELECT from_department AS department FROM scoped WHERE from_department IS NOT NULL
                  UNION SELECT to_department FROM scoped WHERE to_department IS NOT NULL) d
            GROUP BY d.department) x), '[]'::jsonb),
    'accept_by_department', COALESCE((SELECT jsonb_agg(jsonb_build_object('department',department,'avg_hours',avg_hours) ORDER BY avg_hours DESC)
      FROM (SELECT to_department AS department, round(avg(EXTRACT(EPOCH FROM (start_time-created_at))/3600)::numeric,1) AS avg_hours
            FROM scoped WHERE start_time IS NOT NULL AND start_time>created_at AND to_department IS NOT NULL
            GROUP BY to_department) t), '[]'::jsonb),
    'lifecycle_by_department', COALESCE((SELECT jsonb_agg(jsonb_build_object('department',department,'avg_days',avg_days) ORDER BY avg_days DESC)
      FROM (SELECT to_department AS department, round(avg(EXTRACT(EPOCH FROM (end_time-created_at))/86400)::numeric,1) AS avg_days
            FROM scoped WHERE status='Closed' AND end_time IS NOT NULL AND to_department IS NOT NULL
            GROUP BY to_department) t), '[]'::jsonb),
    'transfer_hotspots', COALESCE((SELECT jsonb_agg(jsonb_build_object('department',department,'count',c) ORDER BY c DESC)
      FROM (SELECT from_department AS department, count(*) AS c FROM scoped
            WHERE status='Transferred' AND from_department IS NOT NULL GROUP BY from_department) t), '[]'::jsonb),
    'sankey', COALESCE((SELECT jsonb_agg(jsonb_build_object('source',from_department,'target',to_department,'count',c) ORDER BY c DESC)
      FROM (SELECT from_department, to_department, count(*) AS c FROM scoped
            WHERE from_department IS NOT NULL AND to_department IS NOT NULL AND from_department<>to_department
            GROUP BY from_department, to_department) t), '[]'::jsonb),
    'decline_reasons', COALESCE((SELECT jsonb_agg(jsonb_build_object('reason',reason,'count',c) ORDER BY c DESC)
      FROM (SELECT metadata->>'decline_reason' AS reason, count(*) AS c FROM scoped
            WHERE status='Cancelled' AND metadata->>'decline_reason' IS NOT NULL GROUP BY metadata->>'decline_reason') t), '[]'::jsonb),
    'top_diagnoses', COALESCE((SELECT jsonb_agg(jsonb_build_object('category',category,'count',c) ORDER BY c DESC)
      FROM (SELECT final_diagnosis_category AS category, count(*) AS c FROM scoped
            WHERE final_diagnosis_category IS NOT NULL AND final_diagnosis_category<>''
            GROUP BY final_diagnosis_category ORDER BY count(*) DESC LIMIT 10) t), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;
