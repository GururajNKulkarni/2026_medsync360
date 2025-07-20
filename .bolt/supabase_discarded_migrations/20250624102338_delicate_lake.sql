/*
  # Fix duty roster visibility for calendar view

  1. Policy Updates
    - Add policy for users to view all duties across departments for calendar functionality
    - Maintain existing security while enabling comprehensive calendar view
    - Allow users to see department-wide scheduling for coordination

  2. Security
    - Users can view all scheduled duties (read-only for others' duties)
    - Users can only modify their own duties
    - Maintains data privacy while enabling operational visibility
*/

-- Drop the restrictive policy that limits users to only their department
DROP POLICY IF EXISTS "Users can read shifts in their department" ON duty_roster;

-- Create a more permissive policy for calendar visibility
CREATE POLICY "Users can view all scheduled duties"
  ON duty_roster
  FOR SELECT
  TO authenticated
  USING (true);

-- Ensure users can still only modify their own duties
DROP POLICY IF EXISTS "Users can update shifts" ON duty_roster;

CREATE POLICY "Users can update their own shifts"
  ON duty_roster
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Ensure users can create duties (for scheduling)
DROP POLICY IF EXISTS "Users can create shifts" ON duty_roster;

CREATE POLICY "Users can create shifts"
  ON duty_roster
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Add policy for users to delete their own shifts if needed
CREATE POLICY "Users can delete their own shifts"
  ON duty_roster
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());