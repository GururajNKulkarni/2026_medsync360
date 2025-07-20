/*
  # Create storage.foldername function for storage bucket policies

  1. Function Purpose
    - Extracts folder names from storage object paths
    - Critical for RLS policies that restrict access by user ID
    - Used in expressions like: auth.uid()::text = (storage.foldername(name))[1]

  2. Implementation
    - Safely checks if function already exists before creating
    - Handles edge cases like files with no folders
    - Includes verification test to ensure correct operation
*/

-- Check if the function already exists and create it if it doesn't
DO $$
BEGIN
  -- Check if the function exists in the storage schema
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'storage' AND p.proname = 'foldername'
  ) THEN
    -- Create the function to extract folder names from paths
    CREATE OR REPLACE FUNCTION storage.foldername(name text)
    RETURNS text[] 
    LANGUAGE plpgsql
    AS $$
    DECLARE
      _parts text[];
    BEGIN
      -- Split the path by '/' and return all parts except the last one (filename)
      SELECT string_to_array(name, '/') INTO _parts;
      
      -- If there's only one part (no folders), return empty array
      IF array_length(_parts, 1) <= 1 THEN
        RETURN '{}';
      END IF;
      
      -- Return all parts except the last one
      RETURN _parts[1:array_length(_parts, 1)-1];
    END;
    $$;
    
    RAISE NOTICE 'Created storage.foldername function';
  ELSE
    RAISE NOTICE 'storage.foldername function already exists';
  END IF;
END $$;

-- Verify the function works correctly
DO $$
DECLARE
  _test_result text[];
BEGIN
  -- Test with a sample path
  SELECT storage.foldername('user-123/subfolder/image.jpg') INTO _test_result;
  
  -- Check if the result is as expected
  IF _test_result = ARRAY['user-123', 'subfolder'] THEN
    RAISE NOTICE 'storage.foldername function works correctly';
  ELSE
    RAISE WARNING 'storage.foldername function returned unexpected result: %', _test_result;
  END IF;
  
  -- Test with a path that has no folders
  SELECT storage.foldername('image.jpg') INTO _test_result;
  
  -- Check if the result is an empty array
  IF _test_result = '{}' THEN
    RAISE NOTICE 'storage.foldername function correctly handles files with no folders';
  ELSE
    RAISE WARNING 'storage.foldername function returned unexpected result for file with no folders: %', _test_result;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error testing storage.foldername function: %', SQLERRM;
END $$;