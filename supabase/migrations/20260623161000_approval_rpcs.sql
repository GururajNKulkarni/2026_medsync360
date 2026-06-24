-- Multi-tenant foundation, slice 4: the two approval gates, enforced server-side.
-- Every privileged action re-checks role + hospital scope inside a SECURITY DEFINER
-- RPC; the client is never trusted. See docs/MULTI_TENANT_PLAN.md §7a.

CREATE TABLE IF NOT EXISTS public.superuser_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id),
  hospital_id uuid REFERENCES public.hospitals(id),
  status approval_status NOT NULL DEFAULT 'pending',
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid REFERENCES public.users(id),
  reviewed_at timestamptz
);
ALTER TABLE public.superuser_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read own or platform superuser_requests" ON public.superuser_requests;
CREATE POLICY "read own or platform superuser_requests" ON public.superuser_requests
  FOR SELECT USING (user_id = auth.uid() OR public.current_app_role() = 'platform');

-- ---- Gate 1: a superuser (or platform) approves/rejects a doctor in their hospital ----
CREATE OR REPLACE FUNCTION public.approve_doctor(p_user_id uuid, p_approve boolean)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE me_role text; me_hosp uuid; target_hosp uuid;
BEGIN
  SELECT app_role::text, hospital_id INTO me_role, me_hosp FROM users WHERE id = auth.uid();
  SELECT hospital_id INTO target_hosp FROM users WHERE id = p_user_id;

  IF NOT (
    me_role = 'platform'
    OR (me_role = 'superuser' AND me_hosp IS NOT NULL AND me_hosp = target_hosp)
  ) THEN
    RAISE EXCEPTION 'Not authorized to approve doctors for this hospital';
  END IF;

  UPDATE users
  SET approval_status = CASE WHEN p_approve THEN 'approved'::approval_status ELSE 'rejected'::approval_status END,
      approved_by = auth.uid(),
      approved_at = now()
  WHERE id = p_user_id;
END $$;

-- ---- A doctor asks to become their hospital's superuser ----
CREATE OR REPLACE FUNCTION public.request_superuser()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE my_hosp uuid;
BEGIN
  SELECT hospital_id INTO my_hosp FROM users WHERE id = auth.uid();
  IF EXISTS (SELECT 1 FROM superuser_requests WHERE user_id = auth.uid() AND status = 'pending') THEN
    RAISE EXCEPTION 'You already have a pending superuser request';
  END IF;
  INSERT INTO superuser_requests (user_id, hospital_id) VALUES (auth.uid(), my_hosp);
END $$;

-- ---- Gate 2: the platform owner approves/rejects a superuser request ----
CREATE OR REPLACE FUNCTION public.review_superuser_request(p_request_id uuid, p_approve boolean)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE target uuid;
BEGIN
  IF public.current_app_role() <> 'platform' THEN
    RAISE EXCEPTION 'Only the platform owner can review superuser requests';
  END IF;

  UPDATE superuser_requests
  SET status = CASE WHEN p_approve THEN 'approved'::approval_status ELSE 'rejected'::approval_status END,
      reviewed_by = auth.uid(),
      reviewed_at = now()
  WHERE id = p_request_id AND status = 'pending'
  RETURNING user_id INTO target;

  IF target IS NULL THEN
    RAISE EXCEPTION 'Request not found or already handled';
  END IF;

  IF p_approve THEN
    UPDATE users SET app_role = 'superuser' WHERE id = target;
  END IF;
END $$;

GRANT EXECUTE ON FUNCTION public.approve_doctor(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_superuser() TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_superuser_request(uuid, boolean) TO authenticated;
