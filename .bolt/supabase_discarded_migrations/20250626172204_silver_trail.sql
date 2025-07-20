/*
  # Medical Assistant Production Setup

  1. New Tables
    - Ensure `medical_conversations` table exists with proper structure
    - Add proper indexes for performance optimization
    - Set up appropriate RLS policies

  2. Security
    - Enable RLS on the table
    - Add policies for users to manage their own conversations
    - Ensure proper foreign key constraints
*/

-- Create medical_conversations table if it doesn't exist
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

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can read their own conversations" ON medical_conversations;
DROP POLICY IF EXISTS "Users can create their own conversations" ON medical_conversations;
DROP POLICY IF EXISTS "Users can update their own conversations" ON medical_conversations;
DROP POLICY IF EXISTS "Users can delete their own conversations" ON medical_conversations;

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

-- Create trigger for updated_at if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_medical_conversations_updated_at'
  ) THEN
    CREATE TRIGGER update_medical_conversations_updated_at
      BEFORE UPDATE ON medical_conversations
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Create or replace indexes for better performance
DROP INDEX IF EXISTS idx_medical_conversations_user_id;
CREATE INDEX idx_medical_conversations_user_id ON medical_conversations(user_id);

DROP INDEX IF EXISTS idx_medical_conversations_patient_id;
CREATE INDEX idx_medical_conversations_patient_id ON medical_conversations(patient_id);

DROP INDEX IF EXISTS idx_medical_conversations_visit_date;
CREATE INDEX idx_medical_conversations_visit_date ON medical_conversations(visit_date);

DROP INDEX IF EXISTS idx_medical_conversations_created_at;
CREATE INDEX idx_medical_conversations_created_at ON medical_conversations(created_at DESC);

-- Add full text search capability
DROP INDEX IF EXISTS idx_medical_conversations_fts;
CREATE INDEX idx_medical_conversations_fts ON medical_conversations 
USING gin(to_tsvector('english', patient_name || ' ' || chief_complaint || ' ' || assessment || ' ' || treatment_plan));

-- Add storage bucket for audio recordings if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'medical_recordings', 
  'medical_recordings', 
  false,
  52428800, -- 50MB limit
  ARRAY['audio/wav', 'audio/mpeg', 'audio/webm', 'audio/ogg']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['audio/wav', 'audio/mpeg', 'audio/webm', 'audio/ogg'];

-- Set up storage policies for medical recordings
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Users can upload their own recordings" ON storage.objects;
  DROP POLICY IF EXISTS "Users can access their own recordings" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete their own recordings" ON storage.objects;
  
  -- Create new policies
  CREATE POLICY "Users can upload their own recordings"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'medical_recordings' AND
      (storage.foldername(name))[1] = auth.uid()::text
    );

  CREATE POLICY "Users can access their own recordings"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'medical_recordings' AND
      (storage.foldername(name))[1] = auth.uid()::text
    );

  CREATE POLICY "Users can delete their own recordings"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'medical_recordings' AND
      (storage.foldername(name))[1] = auth.uid()::text
    );
END $$;