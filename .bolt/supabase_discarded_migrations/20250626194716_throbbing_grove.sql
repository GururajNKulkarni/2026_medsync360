/*
  # Fix Chat Functionality

  1. New Functions
    - `find_conversation_by_participants` - Function to find a conversation by its participants
    - This resolves the error: "Could not find the function public.find_conversation_by_participants(participant_array)"

  2. Schema Updates
    - Add `delivered_at` column to `private_messages` table if it doesn't exist
    - This resolves the error: "column private_messages_1.delivered_at does not exist"

  3. Security
    - Grant execute permission to authenticated users
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