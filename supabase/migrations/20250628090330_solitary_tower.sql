/*
  # Add Enum Value Check Function

  1. New Function
    - `check_enum_value_exists` - Checks if a value exists in a PostgreSQL enum type
  
  2. Purpose
    - Allows the application to check if enum values exist before using them
    - Helps with status mapping between UI and database
*/

-- Create function to check if a value exists in an enum
CREATE OR REPLACE FUNCTION check_enum_value_exists(
  enum_name TEXT,
  enum_value TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  value_exists BOOLEAN;
BEGIN
  EXECUTE format('
    SELECT EXISTS (
      SELECT 1 FROM pg_enum 
      WHERE enumlabel = %L AND 
            enumtypid = (SELECT oid FROM pg_type WHERE typname = %L)
    )', enum_value, enum_name)
  INTO value_exists;
  
  RETURN value_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_enum_value_exists(TEXT, TEXT) TO authenticated;