# Supabase Migrations Guide

This document lists all the migration files and storage bucket policies that need to be manually added via the SQL Editor in the Supabase dashboard.

## Migration Files

### 1. Create Users Table and Basic Structure

```sql
-- Create enum for user roles
CREATE TYPE user_role AS ENUM ('PG', 'Senior Resident', 'House', 'Consultant');

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL DEFAULT '',
  role user_role NOT NULL DEFAULT 'PG',
  department text NOT NULL DEFAULT '',
  kmc_number text,
  aadhar_number text,
  phone text,
  avatar_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  date_of_birth date,
  gender text,
  year_of_graduation integer,
  graduated_from text,
  currently_working_at text,
  secondary_phone text,
  profile_completed_at timestamptz
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can read other users basic info"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add check constraints
ALTER TABLE users ADD CONSTRAINT users_gender_check 
  CHECK (gender IN ('Male', 'Female', 'Other'));

ALTER TABLE users ADD CONSTRAINT users_year_graduation_check 
  CHECK (year_of_graduation >= 1920 AND year_of_graduation <= EXTRACT(YEAR FROM CURRENT_DATE));

ALTER TABLE users ADD CONSTRAINT users_secondary_phone_check 
  CHECK (secondary_phone IS NULL OR secondary_phone ~ '^\d{10}$');
```

### 2. Create Referrals Table

```sql
-- Create enums for referral fields
CREATE TYPE referral_urgency AS ENUM ('Normal', 'Urgent', 'Emergency', 'Elective');
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
  updated_at timestamptz DEFAULT now(),
  start_time timestamptz,
  end_time timestamptz
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

-- Create function to automatically update timing columns
CREATE OR REPLACE FUNCTION update_referral_timing()
RETURNS TRIGGER AS $$
BEGIN
  -- Set start_time when status changes to 'Acknowledged' (Accepted)
  IF OLD.status != 'Acknowledged' AND NEW.status = 'Acknowledged' THEN
    NEW.start_time = now();
  END IF;

  -- Set end_time when status changes to 'Closed'
  IF OLD.status != 'Closed' AND NEW.status = 'Closed' THEN
    NEW.end_time = now();
  END IF;

  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for automatic timing updates
CREATE TRIGGER referral_timing_trigger
  BEFORE UPDATE ON referrals
  FOR EACH ROW
  EXECUTE FUNCTION update_referral_timing();
```

### 3. Create Duty Roster Table

```sql
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

CREATE POLICY "Users can view all scheduled duties"
  ON duty_roster
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create shifts"
  ON duty_roster
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own shifts"
  ON duty_roster
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own shifts"
  ON duty_roster
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create trigger for updated_at
CREATE TRIGGER update_duty_roster_updated_at
  BEFORE UPDATE ON duty_roster
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better query performance
CREATE INDEX idx_duty_roster_user_date ON duty_roster(user_id, shift_date);
CREATE INDEX idx_duty_roster_department_date ON duty_roster(department, shift_date);
CREATE INDEX idx_duty_roster_date_dept ON duty_roster(shift_date, department);
CREATE INDEX idx_duty_roster_shift_type ON duty_roster(shift_type, shift_date);
CREATE INDEX idx_duty_roster_status_date ON duty_roster(status, shift_date);
```

### 4. Create Private Messaging Tables

```sql
-- Create enum for message types
CREATE TYPE message_type AS ENUM ('text', 'file', 'image', 'voice');

-- Create private_conversations table
CREATE TABLE IF NOT EXISTS private_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_ids uuid[] NOT NULL,
  last_message_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create private_messages table with enhanced fields
CREATE TABLE IF NOT EXISTS private_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES private_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_encrypted boolean NOT NULL DEFAULT true,
  message_type message_type NOT NULL DEFAULT 'text',
  edited_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE private_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE private_messages ENABLE ROW LEVEL SECURITY;

-- Policies for private_conversations
CREATE POLICY "Users can read conversations they participate in"
  ON private_conversations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = ANY(participant_ids));

CREATE POLICY "Users can create conversations"
  ON private_conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = ANY(participant_ids));

CREATE POLICY "Users can update conversations they participate in"
  ON private_conversations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = ANY(participant_ids));

-- Policies for private_messages
CREATE POLICY "Users can read messages in their conversations"
  ON private_messages
  FOR SELECT
  TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM private_conversations 
      WHERE auth.uid() = ANY(participant_ids)
    )
  );

CREATE POLICY "Users can send messages to their conversations"
  ON private_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    conversation_id IN (
      SELECT id FROM private_conversations 
      WHERE auth.uid() = ANY(participant_ids)
    )
  );

CREATE POLICY "Users can update their own messages"
  ON private_messages
  FOR UPDATE
  TO authenticated
  USING (sender_id = auth.uid());

-- Create function to update last_message_at when a new message is created
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE private_conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_conversation_last_message
  AFTER INSERT ON private_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();

-- Create trigger for updated_at
CREATE TRIGGER update_private_conversations_updated_at
  BEFORE UPDATE ON private_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_private_conversations_participants ON private_conversations USING GIN(participant_ids);
CREATE INDEX idx_private_messages_conversation ON private_messages(conversation_id);
CREATE INDEX idx_private_messages_sender ON private_messages(sender_id);
CREATE INDEX idx_private_messages_created_at ON private_messages(created_at DESC);
CREATE INDEX idx_private_messages_read_status ON private_messages(conversation_id, sender_id) WHERE read_at IS NULL;
```

### 6. Create Helper Functions for Chat

```sql
-- Create function to find conversation by participants
CREATE OR REPLACE FUNCTION find_conversation_by_participants(participant_array uuid[])
RETURNS TABLE(
  id uuid,
  participant_ids uuid[],
  last_message_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pc.id,
    pc.participant_ids,
    pc.last_message_at,
    pc.created_at,
    pc.updated_at
  FROM private_conversations pc
  WHERE pc.participant_ids @> participant_array 
    AND pc.participant_ids <@ participant_array
    AND array_length(pc.participant_ids, 1) = array_length(participant_array, 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION find_conversation_by_participants(uuid[]) TO authenticated;
```

### 5. Create Medical Conversations Table

```sql
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
CREATE TRIGGER update_medical_conversations_updated_at
  BEFORE UPDATE ON medical_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_medical_conversations_user_id ON medical_conversations(user_id);
CREATE INDEX idx_medical_conversations_patient_id ON medical_conversations(patient_id);
CREATE INDEX idx_medical_conversations_visit_date ON medical_conversations(visit_date);
CREATE INDEX idx_medical_conversations_created_at ON medical_conversations(created_at DESC);
CREATE INDEX idx_medical_conversations_fts ON medical_conversations 
USING gin(to_tsvector('english', patient_name || ' ' || chief_complaint || ' ' || assessment || ' ' || treatment_plan));
```

## Storage Buckets and Policies

### 1. Avatars Bucket

```sql
-- Create avatars bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Set up storage policies for avatars
CREATE POLICY "Users can upload their own avatars"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own avatars"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Public can view avatars"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can update their own avatars"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own avatars"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

### 2. Referral Attachments Bucket

```sql
-- Create storage bucket for referral attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'referral_attachments', 
  'referral_attachments', 
  false,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

-- Policy for authenticated users to upload attachments
CREATE POLICY "Users can upload referral attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'referral_attachments');

-- Policy for authenticated users to view attachments
CREATE POLICY "Users can view referral attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'referral_attachments');

-- Policy for authenticated users to delete their attachments
CREATE POLICY "Users can delete their referral attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'referral_attachments');
```

### 3. Medical Recordings Bucket

```sql
-- Add storage bucket for audio recordings
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
```

### 4. Chat Attachments Bucket

```sql
-- Create storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat_attachments', 
  'chat_attachments', 
  false,
  5242880, -- 5MB limit
  ARRAY[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'text/plain',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'text/plain',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

-- Set up storage policies for chat attachments
CREATE POLICY "Users can upload chat attachments"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'chat_attachments' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can access chat attachments"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'chat_attachments'
  );

CREATE POLICY "Users can delete their own chat attachments"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'chat_attachments' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
```

## How to Apply These Migrations

1. Log in to your Supabase dashboard
2. Navigate to the SQL Editor
3. Create a new query
4. Copy and paste each migration section one at a time
5. Run the query
6. Verify that the tables and policies have been created successfully

## Important Notes

- Run these migrations in the order they are listed
- Some migrations may fail if the tables or types already exist
- If a migration fails, check the error message and adjust accordingly
- You may need to modify the migrations to fit your specific needs
- After running the migrations, verify that the tables and policies have been created correctly