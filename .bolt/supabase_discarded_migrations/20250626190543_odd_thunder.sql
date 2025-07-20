/*
  # Fix private_conversations participant relationship

  1. Changes
    - Add a function to properly handle the array-based participant relationship
    - Create a view that exposes participant data in a more queryable format
    - Update RLS policies to maintain security

  2. Security
    - Maintains existing RLS policies
    - Ensures participants can only access conversations they're part of
*/

-- Create a view to make it easier to query participants
CREATE OR REPLACE VIEW conversation_participants AS
SELECT
  c.id as conversation_id,
  unnest(c.participant_ids) as user_id
FROM
  private_conversations c;

-- Create index on the view for better performance
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id
ON conversation_participants(user_id);

-- Create a function to get other participants in a conversation
CREATE OR REPLACE FUNCTION get_other_participants(conversation_id uuid, current_user_id uuid)
RETURNS SETOF uuid AS $$
  SELECT unnest(participant_ids)
  FROM private_conversations
  WHERE id = conversation_id AND current_user_id = ANY(participant_ids)
  AND unnest(participant_ids) != current_user_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- Create a function to check if a user is in a conversation
CREATE OR REPLACE FUNCTION is_conversation_participant(conversation_id uuid, user_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1
    FROM private_conversations
    WHERE id = conversation_id AND user_id = ANY(participant_ids)
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Update RLS policies to use the new functions if needed
DO $$
BEGIN
  -- Drop existing policies if they conflict
  DROP POLICY IF EXISTS "Users can read messages in their conversations" ON private_messages;
  
  -- Create updated policy
  CREATE POLICY "Users can read messages in their conversations"
    ON private_messages
    FOR SELECT
    TO authenticated
    USING (is_conversation_participant(conversation_id, auth.uid()));
END $$;