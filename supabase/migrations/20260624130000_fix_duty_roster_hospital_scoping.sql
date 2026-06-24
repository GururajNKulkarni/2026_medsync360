-- The live duty_roster table had wide-open RLS ("qual: true") for SELECT and
-- UPDATE, and a permissive INSERT, predating the multi-tenant model. Any
-- authenticated doctor could read/modify any hospital's roster. Scope all
-- three to the viewer's/actor's own hospital, with a platform-wide bypass for
-- the Platform Owner and a same-hospital bypass for superusers managing duties
-- on behalf of their hospital's doctors.

-- SELECT -----------------------------------------------------------------
DROP POLICY IF EXISTS "authenticated_users_can_read_all_duties" ON duty_roster;

CREATE POLICY "duty_roster_select_same_hospital"
ON duty_roster
FOR SELECT
TO authenticated
USING (
  duty_roster.user_id = auth.uid()
  OR current_app_role() = 'platform'
  OR EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = duty_roster.user_id
      AND u.hospital_id = current_hospital_id()
  )
);

-- UPDATE -------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can update shifts" ON duty_roster;

CREATE POLICY "duty_roster_update_same_hospital"
ON duty_roster
FOR UPDATE
TO authenticated
USING (
  current_app_role() = 'platform'
  OR EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = duty_roster.user_id
      AND u.hospital_id = current_hospital_id()
  )
)
WITH CHECK (
  current_app_role() = 'platform'
  OR EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = duty_roster.user_id
      AND u.hospital_id = current_hospital_id()
  )
);

-- INSERT -------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can create shifts" ON duty_roster;
DROP POLICY IF EXISTS "users_can_create_duties" ON duty_roster;

CREATE POLICY "duty_roster_insert_same_hospital"
ON duty_roster
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR current_app_role() = 'platform'
  OR (
    current_app_role() = 'superuser'
    AND EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = duty_roster.user_id
        AND u.hospital_id = current_hospital_id()
    )
  )
);
