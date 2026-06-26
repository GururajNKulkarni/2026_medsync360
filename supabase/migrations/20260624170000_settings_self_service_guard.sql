-- Settings page self-service: users may change only their phone number
-- directly, plus password and email via the Supabase Auth API. Everything
-- else on their own row (name, role, department, hospital_id, and
-- critically app_role/approval_status/approved_by/approved_at/is_active)
-- must stay immutable from the client, onboarding excepted.
--
-- This also closes a privilege-escalation hole found while building this
-- feature: the existing "Users can update own data" RLS policy
-- (USING/WITH CHECK: auth.uid() = id) has no column restriction, so any
-- authenticated doctor could already PATCH their own row's app_role or
-- approval_status directly via the REST API and self-grant Platform
-- Owner/superuser access, bypassing the whole approval workflow. Postgres
-- RLS can't express column-level checks, so a BEFORE UPDATE trigger does it.

CREATE OR REPLACE FUNCTION public.guard_user_self_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Only restricts an authenticated end-user editing their OWN row via the
  -- client. Internal/service-role writes (auth.uid() IS NULL — e.g. the
  -- auth-email-sync trigger below) and the platform owner are unrestricted.
  -- The approve_doctor()/review_superuser_request() RPCs always update a
  -- DIFFERENT user's row than the caller's, so they're unaffected here.
  IF auth.uid() IS DISTINCT FROM NEW.id THEN
    RETURN NEW;
  END IF;
  IF current_app_role() = 'platform' THEN
    RETURN NEW;
  END IF;

  -- Privilege/approval fields can never be self-edited, onboarding or not.
  IF NEW.app_role IS DISTINCT FROM OLD.app_role
     OR NEW.approval_status IS DISTINCT FROM OLD.approval_status
     OR NEW.approved_by IS DISTINCT FROM OLD.approved_by
     OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
     OR NEW.is_active IS DISTINCT FROM OLD.is_active
  THEN
    RAISE EXCEPTION 'Not authorized to change protected account fields';
  END IF;

  -- Onboarding (first profile completion) may still set the rest of the
  -- profile, including hospital_id. Once profile_completed_at is set, only
  -- phone is self-editable going forward (Settings page: mobile number).
  -- Email goes through Auth + the sync trigger below, not this path.
  IF OLD.profile_completed_at IS NOT NULL THEN
    IF NEW.full_name IS DISTINCT FROM OLD.full_name
       OR NEW.role IS DISTINCT FROM OLD.role
       OR NEW.department IS DISTINCT FROM OLD.department
       OR NEW.kmc_number IS DISTINCT FROM OLD.kmc_number
       OR NEW.aadhar_number IS DISTINCT FROM OLD.aadhar_number
       OR NEW.avatar_url IS DISTINCT FROM OLD.avatar_url
       OR NEW.date_of_birth IS DISTINCT FROM OLD.date_of_birth
       OR NEW.gender IS DISTINCT FROM OLD.gender
       OR NEW.year_of_graduation IS DISTINCT FROM OLD.year_of_graduation
       OR NEW.graduated_from IS DISTINCT FROM OLD.graduated_from
       OR NEW.currently_working_at IS DISTINCT FROM OLD.currently_working_at
       OR NEW.secondary_phone IS DISTINCT FROM OLD.secondary_phone
       OR NEW.hospital_id IS DISTINCT FROM OLD.hospital_id
       OR NEW.profile_completed_at IS DISTINCT FROM OLD.profile_completed_at
       OR NEW.metadata IS DISTINCT FROM OLD.metadata
       OR NEW.email IS DISTINCT FROM OLD.email
    THEN
      RAISE EXCEPTION 'Only your phone number can be changed here. Update password and email from Settings.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_user_self_update_trigger ON public.users;
CREATE TRIGGER guard_user_self_update_trigger
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.guard_user_self_update();

-- Keep public.users.email in sync once Supabase Auth finalizes an email
-- change (after the user clicks the confirmation link). Runs as the
-- internal role that performs the auth.users update, not the end user, so
-- it bypasses the guard trigger above (auth.uid() IS NULL there).
CREATE OR REPLACE FUNCTION public.sync_user_email_from_auth()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.users SET email = NEW.email, updated_at = now() WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_user_email_from_auth_trigger ON auth.users;
CREATE TRIGGER sync_user_email_from_auth_trigger
AFTER UPDATE OF email ON auth.users
FOR EACH ROW
WHEN (OLD.email IS DISTINCT FROM NEW.email)
EXECUTE FUNCTION public.sync_user_email_from_auth();

-- Trigger functions have no legitimate direct-call use case, but
-- SECURITY DEFINER functions in the public schema are exposed as callable
-- RPCs to anon/authenticated by default via PostgREST. Close that off.
REVOKE EXECUTE ON FUNCTION public.sync_user_email_from_auth() FROM PUBLIC, anon, authenticated;
