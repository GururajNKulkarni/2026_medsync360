-- Multi-tenant foundation, slice 2: the hospitals tenant table.
-- Hospitals become real records (instead of a hardcoded frontend list), so the
-- platform owner can add any hospital and doctors will select from this table.
-- See docs/MULTI_TENANT_PLAN.md.

-- Reusable, RLS-safe role check (SECURITY DEFINER so policies can read the caller's
-- app_role without tripping over users-table RLS). Used by hospital write policies
-- now and by hospital-scoped policies later.
CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$ SELECT app_role::text FROM public.users WHERE id = auth.uid() $$;

CREATE TABLE IF NOT EXISTS public.hospitals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  city text,
  state text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;

-- Any authenticated user may read hospitals (needed for the sign-up dropdown).
DROP POLICY IF EXISTS "authenticated can read hospitals" ON public.hospitals;
CREATE POLICY "authenticated can read hospitals" ON public.hospitals
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only the platform owner may create / update hospitals.
DROP POLICY IF EXISTS "platform can insert hospitals" ON public.hospitals;
CREATE POLICY "platform can insert hospitals" ON public.hospitals
  FOR INSERT WITH CHECK (public.current_app_role() = 'platform');

DROP POLICY IF EXISTS "platform can update hospitals" ON public.hospitals;
CREATE POLICY "platform can update hospitals" ON public.hospitals
  FOR UPDATE USING (public.current_app_role() = 'platform');

-- Seed from the hospitals already referenced by existing users so the list isn't empty.
INSERT INTO public.hospitals (name)
SELECT DISTINCT currently_working_at FROM public.users
WHERE currently_working_at IS NOT NULL AND currently_working_at <> ''
ON CONFLICT (name) DO NOTHING;
