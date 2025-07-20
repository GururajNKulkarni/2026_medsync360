/*
  # Fix Referral Status Mapping

  1. Status Mapping
    - Add function to map between UI and database status values
    - Ensure 'Acknowledged' in database maps to 'Accepted' in UI
    - Ensure 'Accepted' in UI maps to 'Acknowledged' in database
  
  2. Referral Status History
    - Add missing policies for status history tracking
    - Ensure proper permissions for viewing status history
*/

-- Create or replace function to map between UI and database status
CREATE OR REPLACE FUNCTION map_status_for_display(db_status referral_status)
RETURNS TEXT AS $$
BEGIN
  CASE db_status
    WHEN 'Acknowledged' THEN RETURN 'Accepted';
    ELSE RETURN db_status::TEXT;
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create or replace function to map from UI to database status
CREATE OR REPLACE FUNCTION map_status_for_database(ui_status TEXT)
RETURNS referral_status AS $$
BEGIN
  CASE ui_status
    WHEN 'Accepted' THEN RETURN 'Acknowledged'::referral_status;
    ELSE RETURN ui_status::referral_status;
  END CASE;
EXCEPTION WHEN OTHERS THEN
  -- Default to 'Sent' if conversion fails
  RETURN 'Sent'::referral_status;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION map_status_for_display(referral_status) TO authenticated;
GRANT EXECUTE ON FUNCTION map_status_for_database(TEXT) TO authenticated;

-- Ensure the referral_status_history table has proper policies
DO $$ 
BEGIN
  -- Check if the policy exists before creating it
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'referral_status_history' 
    AND policyname = 'Users can view status history for referrals they are involved with'
  ) THEN
    CREATE POLICY "Users can view status history for referrals they are involved with"
      ON referral_status_history
      FOR SELECT
      TO authenticated
      USING (
        referral_id IN (
          SELECT id FROM referrals
          WHERE from_user_id = auth.uid() 
             OR to_user_id = auth.uid()
             OR to_department IN (
                SELECT department FROM users WHERE id = auth.uid()
             )
        )
      );
  END IF;
END $$;