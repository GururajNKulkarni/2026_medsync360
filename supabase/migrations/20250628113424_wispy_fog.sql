/*
  # Fix check_column_exists function

  1. Changes
     - Drop existing check_column_exists function
     - Recreate function with prefixed parameter names to avoid ambiguity
*/

-- First drop the existing function
DROP FUNCTION IF EXISTS check_column_exists(text, text);

-- Then recreate it with prefixed parameter names
CREATE OR REPLACE FUNCTION check_column_exists(p_table_name text, p_column_name text)
RETURNS boolean AS $$
DECLARE
    col_exists boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = p_table_name
        AND column_name = p_column_name
    ) INTO col_exists;
    RETURN col_exists;
END;
$$ LANGUAGE plpgsql;