-- Migration: Add missing from_department column and correct medication_history RLS policies
-- Generated on: 2025-07-30 12:30 UTC

BEGIN;

------------------------------------------------------------------
-- 1. Schema fix: add from_department to referrals
------------------------------------------------------------------
ALTER TABLE referrals
ADD COLUMN IF NOT EXISTS from_department TEXT;

-- Populate existing rows where possible (best-effort, safe)
UPDATE referrals AS r
SET from_department = u.department
FROM users u
WHERE r.from_department IS NULL
  AND u.id = r.from_user_id;

------------------------------------------------------------------
-- 2. RLS policy correction for medication_history
--    Old policies referenced r.department (non-existent).
--    Use r.to_department OR r.from_department instead.
------------------------------------------------------------------
-- View policy
DROP POLICY IF EXISTS "Users can view medication history for their department's referrals" ON medication_history;
CREATE POLICY "Users can view medication history for their department's referrals"
    ON medication_history FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM referrals r
            JOIN users u ON u.id = auth.uid()
            WHERE r.id = medication_history.referral_id
              AND (u.department = r.to_department OR u.department = r.from_department)
        )
    );

-- Insert policy
DROP POLICY IF EXISTS "Users can insert medication history for their department's referrals" ON medication_history;
CREATE POLICY "Users can insert medication history for their department's referrals"
    ON medication_history FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM referrals r
            JOIN users u ON u.id = auth.uid()
            WHERE r.id = medication_history.referral_id
              AND (u.department = r.to_department OR u.department = r.from_department)
        )
    );

COMMIT;
