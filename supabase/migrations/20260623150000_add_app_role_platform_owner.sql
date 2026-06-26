-- Multi-tenant foundation, slice 1: access-control role (separate from clinical role).
-- Adds users.app_role and designates the platform owner. Non-breaking: additive
-- column with a default; everyone is 'doctor' unless explicitly elevated. No RLS or
-- behavior changes yet — see docs/MULTI_TENANT_PLAN.md.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE app_role AS ENUM ('doctor', 'superuser', 'platform');
  END IF;
END $$;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS app_role app_role NOT NULL DEFAULT 'doctor';

-- Platform owner (vendor / you). The only cross-hospital admin.
UPDATE public.users SET app_role = 'platform' WHERE email = 'medsync360@gmail.com';
