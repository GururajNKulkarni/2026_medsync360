/*
  # Create referrals table for medical referral management

  1. New Tables
    - `referrals`
      - `id` (uuid, primary key) - Unique referral identifier
      - `title` (text, not null) - Referral title/subject
      - `description` (text, not null) - Detailed referral description
      - `urgency` (enum) - Priority level: Normal, Urgent, Emergency
      - `status` (enum) - Current status: Sent, Received, Acknowledged, Cancelled
      - `from_user_id` (uuid, not null) - Referring doctor ID
      - `to_department` (text, not null) - Target department
      - `to_user_id` (uuid, nullable) - Specific target doctor (optional)
      - `attachments` (text array, nullable) - File attachment URLs
      - `created_at` (timestamptz, default now()) - Creation timestamp
      - `updated_at` (timestamptz, default now()) - Last update timestamp

  2. Security
    - Enable RLS on `referrals` table
    - Add policy for users to read referrals they sent or received
    - Add policy for users to create referrals
    - Add policy for users to update referrals they're involved in
*/

-- Create enums for referral fields
CREATE TYPE referral_urgency AS ENUM ('Normal', 'Urgent', 'Emergency');
CREATE TYPE referral_status AS ENUM ('Sent', 'Received', 'Acknowledged', 'Cancelled');

-- Create referrals table
CREATE TABLE IF NOT EXISTS referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  urgency referral_urgency NOT NULL DEFAULT 'Normal',
  status referral_status NOT NULL DEFAULT 'Sent',
  from_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_department text NOT NULL,
  to_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  attachments text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read referrals they sent"
  ON referrals
  FOR SELECT
  TO authenticated
  USING (from_user_id = auth.uid());

CREATE POLICY "Users can read referrals sent to them"
  ON referrals
  FOR SELECT
  TO authenticated
  USING (to_user_id = auth.uid());

CREATE POLICY "Users can read referrals to their department"
  ON referrals
  FOR SELECT
  TO authenticated
  USING (
    to_department IN (
      SELECT department FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create referrals"
  ON referrals
  FOR INSERT
  TO authenticated
  WITH CHECK (from_user_id = auth.uid());

CREATE POLICY "Users can update referrals they sent"
  ON referrals
  FOR UPDATE
  TO authenticated
  USING (from_user_id = auth.uid());

CREATE POLICY "Users can update referrals sent to them"
  ON referrals
  FOR UPDATE
  TO authenticated
  USING (to_user_id = auth.uid());

-- Create trigger for updated_at
CREATE TRIGGER update_referrals_updated_at
  BEFORE UPDATE ON referrals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();