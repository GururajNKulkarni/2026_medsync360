/*
  # Add Referral Decline Reasons and Status History

  1. New Tables
    - `referral_decline_reasons` - Stores standardized decline reasons
    - `referral_status_history` - Tracks status changes with reasons
  
  2. Security
    - Enable RLS on new tables
    - Add policies for proper access control
    
  3. Functions
    - Add functions to record and retrieve decline reasons
*/

-- Create table for standardized decline reasons
CREATE TABLE IF NOT EXISTS referral_decline_reasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reason_code text NOT NULL UNIQUE,
  reason_label text NOT NULL,
  reason_description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE referral_decline_reasons ENABLE ROW LEVEL SECURITY;

-- Create policy for reading decline reasons (only if it doesn't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'referral_decline_reasons' 
    AND policyname = 'Anyone can read decline reasons'
  ) THEN
    CREATE POLICY "Anyone can read decline reasons"
      ON referral_decline_reasons
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Insert standard decline reasons
INSERT INTO referral_decline_reasons (reason_code, reason_label, reason_description)
VALUES 
  ('incorrect_details', 'Incorrect Details', 'Patient information or clinical details are incorrect or incomplete'),
  ('not_needed', 'Not Needed Anymore', 'Referral is no longer required due to patient condition change or other factors'),
  ('not_on_duty', 'Not On Duty', 'Currently not available or on duty to handle this referral')
ON CONFLICT (reason_code) DO NOTHING;

-- Create table for referral status history with reasons
CREATE TABLE IF NOT EXISTS referral_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id uuid NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
  previous_status referral_status,
  new_status referral_status NOT NULL,
  changed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  reason_id uuid REFERENCES referral_decline_reasons(id) ON DELETE SET NULL,
  custom_reason text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE referral_status_history ENABLE ROW LEVEL SECURITY;

-- Create policies for referral status history (only if they don't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'referral_status_history' 
    AND policyname = 'Users can view status history for referrals they are involved w'
  ) THEN
    CREATE POLICY "Users can view status history for referrals they are involved w"
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

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'referral_status_history' 
    AND policyname = 'Users can insert status history'
  ) THEN
    CREATE POLICY "Users can insert status history"
      ON referral_status_history
      FOR INSERT
      TO authenticated
      WITH CHECK (changed_by = auth.uid());
  END IF;
END $$;

-- Create function to record status change with reason (drop first if exists)
DROP FUNCTION IF EXISTS record_referral_status_change(uuid, referral_status, referral_status, text, text);

CREATE OR REPLACE FUNCTION record_referral_status_change(
  ref_id uuid,
  prev_status referral_status,
  new_status referral_status,
  reason_code text DEFAULT NULL,
  custom_reason text DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  reason_id uuid;
  history_id uuid;
BEGIN
  -- Get reason_id if reason_code is provided
  IF reason_code IS NOT NULL THEN
    SELECT id INTO reason_id
    FROM referral_decline_reasons
    WHERE reason_code = record_referral_status_change.reason_code;
  END IF;
  
  -- Insert status change record
  INSERT INTO referral_status_history (
    referral_id,
    previous_status,
    new_status,
    changed_by,
    reason_id,
    custom_reason
  ) VALUES (
    ref_id,
    prev_status,
    new_status,
    auth.uid(),
    reason_id,
    custom_reason
  ) RETURNING id INTO history_id;
  
  RETURN history_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION record_referral_status_change(uuid, referral_status, referral_status, text, text) TO authenticated;

-- Create function to get decline reasons for a referral (drop first if exists)
DROP FUNCTION IF EXISTS get_referral_decline_reasons(uuid);

CREATE OR REPLACE FUNCTION get_referral_decline_reasons(ref_id uuid)
RETURNS TABLE (
  status_change_id uuid,
  previous_status text,
  new_status text,
  changed_at timestamptz,
  changed_by_name text,
  reason_label text,
  custom_reason text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rsh.id,
    rsh.previous_status::text,
    rsh.new_status::text,
    rsh.created_at,
    u.full_name,
    rdr.reason_label,
    rsh.custom_reason
  FROM referral_status_history rsh
  LEFT JOIN users u ON rsh.changed_by = u.id
  LEFT JOIN referral_decline_reasons rdr ON rsh.reason_id = rdr.id
  WHERE rsh.referral_id = ref_id
  AND rsh.new_status = 'Cancelled'
  ORDER BY rsh.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_referral_decline_reasons(uuid) TO authenticated;