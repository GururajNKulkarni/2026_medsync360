/*
  # Create medical_conversations table for AI Medical Assistant

  1. New Tables
    - `medical_conversations`
      - `id` (uuid, primary key) - Unique conversation identifier
      - `user_id` (uuid, not null) - Doctor who recorded the conversation
      - `patient_name` (text, not null) - Patient's name
      - `patient_id` (text, not null) - Patient identifier
      - `visit_date` (date, not null) - Date of the medical visit
      - `transcript` (text, not null) - Full conversation transcript
      - `chief_complaint` (text, not null) - Extracted chief complaint
      - `assessment` (text, not null) - Medical assessment
      - `treatment_plan` (text, not null) - Treatment plan
      - `confidence_score` (integer, not null) - AI confidence score (0-100)
      - `medical_data` (jsonb, not null) - Complete AI-processed medical data
      - `created_at` (timestamptz, default now()) - Record creation time
      - `updated_at` (timestamptz, default now()) - Last update time

  2. Security
    - Enable RLS on `medical_conversations` table
    - Add policy for users to read their own conversations
    - Add policy for users to create their own conversations
    - Add policy for users to update their own conversations
    - Add policy for users to delete their own conversations
*/

-- Create update_updated_at_column function if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column'
  ) THEN
    CREATE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ language 'plpgsql';
  END IF;
END $$;

-- Create medical_conversations table
CREATE TABLE IF NOT EXISTS medical_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- Enable RLS
ALTER TABLE medical_conversations ENABLE ROW LEVEL SECURITY;

-- Create policies for medical_conversations
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