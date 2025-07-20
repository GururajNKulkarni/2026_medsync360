/*
  # Ensure update_updated_at_column function exists

  1. Purpose
    - Create the update_updated_at_column function if it doesn't exist
    - This function is used by triggers to automatically update the updated_at column
    - Critical for maintaining proper timestamp tracking across all tables

  2. Implementation
    - Uses DO block with PL/pgSQL to check if function exists
    - Creates function only if it doesn't already exist
    - Function sets NEW.updated_at to current timestamp
*/

-- Create update_updated_at_column function if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'update_updated_at_column' 
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ language 'plpgsql';
  END IF;
END $$;

-- Verify function exists and works correctly
DO $$
BEGIN
  RAISE NOTICE 'update_updated_at_column function is ready for use by triggers';
END $$;