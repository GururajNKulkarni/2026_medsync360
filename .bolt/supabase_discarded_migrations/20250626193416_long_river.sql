/*
  # Create storage.foldername function for bucket policies

  1. Function Creation
    - Create storage.foldername function to extract folder names from object paths
    - Used by storage bucket policies to enforce user-specific access
    - Returns array of folder names from a file path

  2. Testing
    - Verify function works correctly with sample paths
    - Test edge cases like files with no folders
*/

-- Create the storage.foldername function
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

-- Test the function with sample data
DO $$
DECLARE
  _test_result text[];
BEGIN
  -- Test with a sample path that has folders
  SELECT storage.foldername('user-123/subfolder/image.jpg') INTO _test_result;
  
  -- Check if the result is as expected
  IF _test_result = ARRAY['user-123', 'subfolder'] THEN
    RAISE NOTICE 'storage.foldername function works correctly with folders';
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
  
  -- Test with a single folder
  SELECT storage.foldername('user-456/profile.png') INTO _test_result;
  
  IF _test_result = ARRAY['user-456'] THEN
    RAISE NOTICE 'storage.foldername function correctly handles single folder paths';
  ELSE
    RAISE WARNING 'storage.foldername function returned unexpected result for single folder: %', _test_result;
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error testing storage.foldername function: %', SQLERRM;
END $$;