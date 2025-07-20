/*
  # Complete medical conversations setup with all dependencies

  1. New Tables
    - `users` (if not exists) - User authentication table
    - `medical_conversations` - Medical conversation records

  2. Functions
    - `update_updated_at_column()` - Trigger function for updating timestamps

  3. Security
    - Enable RLS on both tables
    - Add comprehensive policies for medical_conversations
*/

-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  full_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' AND policyname = 'Users can read own profile'
  ) THEN
    CREATE POLICY "Users can read own profile"
      ON users
      FOR SELECT
      TO authenticated
      USING (id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile"
      ON users
      FOR UPDATE
      TO authenticated
      USING (id = auth.uid())
      WITH CHECK (id = auth.uid());
  END IF;
END $$;

-- Create update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create medical_conversations table
CREATE TABLE IF NOT EXISTS medical_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  patient_name text NOT NULL,
  patient_id text NOT NULL,
  visit_date date NOT NULL,
  transcript text NOT NULL,
  chief_complaint text NOT NULL,
  assessment text NOT NULL,
  treatment_plan text NOT NULL,
  confidence_score integer NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
  medical_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on medical_conversations
ALTER TABLE medical_conversations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DO $$
BEGIN
  -- Drop existing policies
  DROP POLICY IF EXISTS "Users can read their own conversations" ON medical_conversations;
  DROP POLICY IF EXISTS "Users can create their own conversations" ON medical_conversations;
  DROP POLICY IF EXISTS "Users can update their own conversations" ON medical_conversations;
  DROP POLICY IF EXISTS "Users can delete their own conversations" ON medical_conversations;
  
  -- Create new policies
  CREATE POLICY "Users can read their own conversations"
    ON medical_conversations
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

  CREATE POLICY "Users can create their own conversations"
    ON medical_conversations
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

  CREATE POLICY "Users can update their own conversations"
    ON medical_conversations
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

  CREATE POLICY "Users can delete their own conversations"
    ON medical_conversations
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());
END $$;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_medical_conversations_updated_at ON medical_conversations;
CREATE TRIGGER update_medical_conversations_updated_at
  BEFORE UPDATE ON medical_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_medical_conversations_user_id ON medical_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_medical_conversations_patient_id ON medical_conversations(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_conversations_visit_date ON medical_conversations(visit_date);
CREATE INDEX IF NOT EXISTS idx_medical_conversations_created_at ON medical_conversations(created_at DESC);