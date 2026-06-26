-- Bell notifications for pending approvals:
-- 1) A doctor's registration becomes pending (signup completes onboarding,
--    hospital_id gets set) -> notify every superuser at that hospital.
-- 2) A doctor requests superuser access -> notify every platform owner.
-- Both run SECURITY DEFINER since the firing statement is a plain
-- authenticated UPDATE/INSERT by the doctor themselves, who has no RLS
-- grant to insert duty_notifications rows addressed to someone else.

CREATE OR REPLACE FUNCTION public.notify_superusers_of_pending_doctor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  su RECORD;
BEGIN
  IF NEW.approval_status = 'pending' AND NEW.hospital_id IS NOT NULL THEN
    FOR su IN
      SELECT id FROM users
      WHERE hospital_id = NEW.hospital_id
        AND app_role = 'superuser'
        AND is_active = true
        AND id <> NEW.id
    LOOP
      INSERT INTO duty_notifications (recipient_id, actor_id, type, title, message, is_read)
      VALUES (
        su.id, NEW.id, 'doctor_approval_pending',
        'New doctor registration',
        NEW.full_name || ' (' || NEW.role || ', ' || NEW.department || ') is awaiting your approval.',
        false
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_superusers_of_pending_doctor_trigger ON public.users;
CREATE TRIGGER notify_superusers_of_pending_doctor_trigger
AFTER INSERT OR UPDATE OF approval_status, hospital_id ON public.users
FOR EACH ROW
WHEN (NEW.approval_status = 'pending' AND NEW.hospital_id IS NOT NULL)
EXECUTE FUNCTION public.notify_superusers_of_pending_doctor();

CREATE OR REPLACE FUNCTION public.notify_platform_owners_of_superuser_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  po RECORD;
  requester_name TEXT;
BEGIN
  IF NEW.status = 'pending' THEN
    SELECT full_name INTO requester_name FROM users WHERE id = NEW.user_id;
    FOR po IN SELECT id FROM users WHERE app_role = 'platform' AND is_active = true LOOP
      INSERT INTO duty_notifications (recipient_id, actor_id, type, title, message, is_read)
      VALUES (
        po.id, NEW.user_id, 'superuser_request_pending',
        'Superuser access requested',
        COALESCE(requester_name, 'A doctor') || ' has requested superuser access.',
        false
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_platform_owners_of_superuser_request_trigger ON public.superuser_requests;
CREATE TRIGGER notify_platform_owners_of_superuser_request_trigger
AFTER INSERT ON public.superuser_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_platform_owners_of_superuser_request();

-- Trigger-only functions; close the default PostgREST RPC exposure.
REVOKE EXECUTE ON FUNCTION public.notify_superusers_of_pending_doctor() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_platform_owners_of_superuser_request() FROM PUBLIC, anon, authenticated;

-- Backfill: notify for approvals that are already pending right now (e.g.
-- doctors who completed onboarding before this migration existed), so they
-- show up immediately instead of only on the next state change.
INSERT INTO duty_notifications (recipient_id, actor_id, type, title, message, is_read)
SELECT su.id, u.id, 'doctor_approval_pending',
       'New doctor registration',
       u.full_name || ' (' || u.role || ', ' || u.department || ') is awaiting your approval.',
       false
FROM users u
JOIN users su ON su.hospital_id = u.hospital_id AND su.app_role = 'superuser' AND su.is_active = true AND su.id <> u.id
WHERE u.approval_status = 'pending' AND u.hospital_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM duty_notifications dn
    WHERE dn.recipient_id = su.id AND dn.actor_id = u.id AND dn.type = 'doctor_approval_pending'
  );

INSERT INTO duty_notifications (recipient_id, actor_id, type, title, message, is_read)
SELECT po.id, sr.user_id, 'superuser_request_pending',
       'Superuser access requested',
       COALESCE(u.full_name, 'A doctor') || ' has requested superuser access.',
       false
FROM superuser_requests sr
JOIN users u ON u.id = sr.user_id
JOIN users po ON po.app_role = 'platform' AND po.is_active = true
WHERE sr.status = 'pending'
  AND NOT EXISTS (
    SELECT 1 FROM duty_notifications dn
    WHERE dn.recipient_id = po.id AND dn.actor_id = sr.user_id AND dn.type = 'superuser_request_pending'
  );
