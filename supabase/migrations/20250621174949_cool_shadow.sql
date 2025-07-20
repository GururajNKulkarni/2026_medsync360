/*
  # Create messaging tables for private conversations

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
      - `is_encrypted` (boolean, default false) - Encryption status
      - `message_type` (enum) - Type: text, file, image, voice
      - `edited_at` (timestamptz, nullable) - Edit timestamp
      - `created_at` (timestamptz, default now()) - Creation timestamp

  2. Security
    - Enable RLS on both tables
    - Add policies for conversation participants to access their conversations
    - Add policies for message access based on conversation participation
*/

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

-- Create private_messages table
CREATE TABLE IF NOT EXISTS private_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES private_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_encrypted boolean NOT NULL DEFAULT false,
  message_type message_type NOT NULL DEFAULT 'text',
  edited_at timestamptz,
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

-- Create triggers for updated_at
CREATE TRIGGER update_private_conversations_updated_at
  BEFORE UPDATE ON private_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_private_conversations_participants ON private_conversations USING GIN(participant_ids);
CREATE INDEX IF NOT EXISTS idx_private_messages_conversation ON private_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_private_messages_sender ON private_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_private_messages_created_at ON private_messages(created_at DESC);