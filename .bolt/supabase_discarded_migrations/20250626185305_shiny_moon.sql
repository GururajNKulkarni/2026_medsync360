/*
  # Create private messaging tables with enhanced features

  1. New Tables
    - `private_conversations`
      - `id` (uuid, primary key) - Unique conversation identifier
      - `participant_ids` (uuid array, not null) - Array of user IDs in conversation
      - `last_message_at` (timestamptz, nullable) - Timestamp of last message
      - `created_at` (timestamptz, default now()) - Creation timestamp
      - `updated_at` (timestamptz, default now()) - Last update timestamp

    - `private_messages`
      - `id` (uuid, primary key) - Unique message identifier
      - `conversation_id` (uuid, not null) - Reference to conversation
      - `sender_id` (uuid, not null) - Message sender ID
      - `content` (text, not null) - Message content
      - `is_encrypted` (boolean, default true) - Encryption status
      - `message_type` (enum) - Type: text, file, image, voice
      - `edited_at` (timestamptz, nullable) - Edit timestamp
      - `delivered_at` (timestamptz, nullable) - Delivery timestamp
      - `read_at` (timestamptz, nullable) - Read timestamp
      - `created_at` (timestamptz, default now()) - Creation timestamp

  2. Security
    - Enable RLS on both tables
    - Add policies for conversation participants to access their conversations
    - Add policies for message access based on conversation participation
*/

-- Create enum for message types if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_type') THEN
    CREATE TYPE message_type AS ENUM ('text', 'file', 'image', 'voice');
  END IF;
END$$;

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

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_conversation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_private_conversations_updated_at
  BEFORE UPDATE ON private_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_updated_at();

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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_private_conversations_participants ON private_conversations USING GIN(participant_ids);
CREATE INDEX IF NOT EXISTS idx_private_messages_conversation ON private_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_private_messages_sender ON private_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_private_messages_created_at ON private_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_private_messages_read_status ON private_messages(conversation_id, sender_id) WHERE read_at IS NULL;

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