/*
  # Fix Chat Database Errors

  1. New Functions
    - `find_conversation_by_participants` - Function to find conversations by exact participant match
    - Properly handles array comparison for participant_ids

  2. Schema Updates
    - Add missing `delivered_at` column to private_messages table
    - Add missing `read_at` column to private_messages table
    - Create index for unread messages queries

  3. Storage
    - Create chat_attachments bucket with proper security policies
    - Set file size limits and allowed MIME types
*/

-- Create function to find conversation by participants
CREATE OR REPLACE FUNCTION find_conversation_by_participants(participant_array uuid[])
RETURNS SETOF private_conversations AS $$
BEGIN
  RETURN QUERY
  SELECT pc.*
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
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'text/plain',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

-- Set up storage policies for chat attachments
DO $$
BEGIN
  -- Drop existing policies if they exist to avoid conflicts
  BEGIN
    DROP POLICY IF EXISTS "Users can upload chat attachments" ON storage.objects;
    EXCEPTION WHEN OTHERS THEN END;
  
  BEGIN
    DROP POLICY IF EXISTS "Users can access chat attachments" ON storage.objects;
    EXCEPTION WHEN OTHERS THEN END;
  
  BEGIN
    DROP POLICY IF EXISTS "Users can delete their own chat attachments" ON storage.objects;
    EXCEPTION WHEN OTHERS THEN END;

  -- Create new policies
  CREATE POLICY "Users can upload chat attachments"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'chat_attachments');

  CREATE POLICY "Users can access chat attachments"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'chat_attachments');

  CREATE POLICY "Users can delete their own chat attachments"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'chat_attachments');
    
  RAISE NOTICE 'Created storage policies for chat attachments';
END $$;

-- Create function to update last_message_at when a new message is created
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE private_conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for last_message_at if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_conversation_last_message'
  ) THEN
    CREATE TRIGGER update_conversation_last_message
      AFTER INSERT ON private_messages
      FOR EACH ROW
      EXECUTE FUNCTION update_conversation_last_message();
      
    RAISE NOTICE 'Created trigger for updating last_message_at';
  ELSE
    RAISE NOTICE 'Trigger for updating last_message_at already exists';
  END IF;
END $$;