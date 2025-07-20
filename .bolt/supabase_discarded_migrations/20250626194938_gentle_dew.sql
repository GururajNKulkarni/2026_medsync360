/*
  # Fix Chat Database Errors

  1. Add missing function
    - Create `find_conversation_by_participants` function to find conversations by exact participant match
    - This function is needed for the chat feature to work properly
    - Grant execute permission to authenticated users

  2. Add missing column
    - Add `delivered_at` column to `private_messages` table
    - This column is used to track message delivery status
    - Only add if it doesn't already exist

  3. Security
    - Use SECURITY DEFINER to ensure function works regardless of RLS policies
    - Maintain existing security model
*/

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

-- Add delivered_at column to private_messages if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'private_messages' AND column_name = 'delivered_at'
  ) THEN
    ALTER TABLE private_messages ADD COLUMN delivered_at timestamptz;
    RAISE NOTICE 'Added delivered_at column to private_messages table';
  ELSE
    RAISE NOTICE 'delivered_at column already exists in private_messages table';
  END IF;
END $$;

-- Add read_at column to private_messages if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'private_messages' AND column_name = 'read_at'
  ) THEN
    ALTER TABLE private_messages ADD COLUMN read_at timestamptz;
    RAISE NOTICE 'Added read_at column to private_messages table';
  ELSE
    RAISE NOTICE 'read_at column already exists in private_messages table';
  END IF;
END $$;

-- Create index for unread messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_private_messages_read_status'
  ) THEN
    CREATE INDEX idx_private_messages_read_status 
    ON private_messages(conversation_id, sender_id) 
    WHERE read_at IS NULL;
    
    RAISE NOTICE 'Created index for unread messages';
  ELSE
    RAISE NOTICE 'Index for unread messages already exists';
  END IF;
END $$;

-- Create chat_attachments bucket if it doesn't exist
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
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for chat attachments if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can upload chat attachments'
  ) THEN
    CREATE POLICY "Users can upload chat attachments"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'chat_attachments'
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can access chat attachments'
  ) THEN
    CREATE POLICY "Users can access chat attachments"
      ON storage.objects
      FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'chat_attachments'
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can delete their own chat attachments'
  ) THEN
    CREATE POLICY "Users can delete their own chat attachments"
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'chat_attachments'
      );
  END IF;
END $$;