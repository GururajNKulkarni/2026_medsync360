-- Multi-tenant foundation, slice 3: tie users to a hospital + add the approval gate.
-- Non-breaking: additive columns. CRITICAL — all EXISTING users are set to
-- 'approved' so the new pending-gate (shipped next) never locks anyone out.
-- See docs/MULTI_TENANT_PLAN.md.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'approval_status') THEN
    CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');
  END IF;
END $$;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS hospital_id uuid REFERENCES public.hospitals(id),
  ADD COLUMN IF NOT EXISTS approval_status approval_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;

-- Backfill hospital_id from the existing free-text hospital name.
UPDATE public.users u
SET hospital_id = h.id
FROM public.hospitals h
WHERE u.hospital_id IS NULL
  AND u.currently_working_at = h.name;

-- Every pre-existing account is grandfathered in as approved (no lockout).
UPDATE public.users
SET approval_status = 'approved', approved_at = now()
WHERE approval_status <> 'approved';

-- RLS-safe helper: the caller's hospital (used by hospital-scoped policies later).
CREATE OR REPLACE FUNCTION public.current_hospital_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$ SELECT hospital_id FROM public.users WHERE id = auth.uid() $$;
