/*
  # Add metadata column to referrals table

  1. Changes
     - Add metadata column to referrals table to store additional patient information
     - Create helper function to check if a column exists in a table

  This migration adds a JSONB metadata column to the referrals table to store
  additional patient information like age, sex, and admission date that aren't
  part of the original schema.
*/

-- Add metadata column to referrals table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'referrals' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE referrals ADD COLUMN metadata JSONB;
  END IF;
END $$;

-- Create helper function to check if a column exists
CREATE OR REPLACE FUNCTION check_column_exists(
  table_name TEXT,
  column_name TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  column_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = check_column_exists.table_name 
    AND column_name = check_column_exists.column_name
  ) INTO column_exists;
  
  RETURN column_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_column_exists(TEXT, TEXT) TO authenticated;