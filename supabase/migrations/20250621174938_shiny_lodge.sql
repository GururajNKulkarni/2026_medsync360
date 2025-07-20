/*
  # Create duty roster table for shift management

  1. New Tables
    - `duty_roster`
      - `id` (uuid, primary key) - Unique shift identifier
      - `user_id` (uuid, not null) - Assigned doctor ID
      - `department` (text, not null) - Department for the shift
      - `shift_date` (date, not null) - Date of the shift
      - `shift_type` (enum) - Type: Day, Night, On Call
      - `start_time` (time, not null) - Shift start time
      - `end_time` (time, not null) - Shift end time
      - `status` (enum) - Status: Scheduled, Completed, Swapped
      - `created_at` (timestamptz, default now()) - Creation timestamp
      - `updated_at` (timestamptz, default now()) - Last update timestamp

  2. Security
    - Enable RLS on `duty_roster` table
    - Add policy for users to read their own shifts
    - Add policy for users to read shifts in their department
    - Add policy for authorized users to manage shifts
*/

-- Create enums for duty roster fields
CREATE TYPE shift_type AS ENUM ('Day', 'Night', 'On Call');
CREATE TYPE shift_status AS ENUM ('Scheduled', 'Completed', 'Swapped');

-- Create duty_roster table
CREATE TABLE IF NOT EXISTS duty_roster (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  department text NOT NULL,
  shift_date date NOT NULL,
  shift_type shift_type NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  status shift_status NOT NULL DEFAULT 'Scheduled',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE duty_roster ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read their own shifts"
  ON duty_roster
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can read shifts in their department"
  ON duty_roster
  FOR SELECT
  TO authenticated
  USING (
    department IN (
      SELECT department FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create shifts"
  ON duty_roster
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update shifts"
  ON duty_roster
  FOR UPDATE
  TO authenticated
  USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_duty_roster_updated_at
  BEFORE UPDATE ON duty_roster
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_duty_roster_user_date ON duty_roster(user_id, shift_date);
CREATE INDEX IF NOT EXISTS idx_duty_roster_department_date ON duty_roster(department, shift_date);