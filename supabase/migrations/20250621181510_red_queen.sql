/*
  # Extend users table for onboarding

  1. New Columns
    - `date_of_birth` (date) - User's date of birth
    - `gender` (text) - User's gender
    - `year_of_graduation` (integer) - Year of graduation
    - `graduated_from` (text) - College graduated from
    - `currently_working_at` (text) - Current workplace
    - `secondary_phone` (text) - Secondary phone number
    - `profile_completed_at` (timestamptz) - When profile was completed

  2. Updates
    - Add check constraints for data validation
    - Update existing policies if needed
*/

-- Add new columns to users table
DO $$
BEGIN
  -- Add date_of_birth column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'date_of_birth'
  ) THEN
    ALTER TABLE users ADD COLUMN date_of_birth date;
  END IF;

  -- Add gender column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'gender'
  ) THEN
    ALTER TABLE users ADD COLUMN gender text;
  END IF;

  -- Add year_of_graduation column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'year_of_graduation'
  ) THEN
    ALTER TABLE users ADD COLUMN year_of_graduation integer;
  END IF;

  -- Add graduated_from column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'graduated_from'
  ) THEN
    ALTER TABLE users ADD COLUMN graduated_from text;
  END IF;

  -- Add currently_working_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'currently_working_at'
  ) THEN
    ALTER TABLE users ADD COLUMN currently_working_at text;
  END IF;

  -- Add secondary_phone column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'secondary_phone'
  ) THEN
    ALTER TABLE users ADD COLUMN secondary_phone text;
  END IF;

  -- Add profile_completed_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'profile_completed_at'
  ) THEN
    ALTER TABLE users ADD COLUMN profile_completed_at timestamptz;
  END IF;
END $$;

-- Add check constraints
DO $$
BEGIN
  -- Gender constraint
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'users_gender_check'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_gender_check 
    CHECK (gender IN ('Male', 'Female', 'Other'));
  END IF;

  -- Year of graduation constraint (reasonable range)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'users_year_graduation_check'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_year_graduation_check 
    CHECK (year_of_graduation >= 1920 AND year_of_graduation <= EXTRACT(YEAR FROM CURRENT_DATE));
  END IF;

  -- Secondary phone format (if provided)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'users_secondary_phone_check'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_secondary_phone_check 
    CHECK (secondary_phone IS NULL OR secondary_phone ~ '^\d{10}$');
  END IF;
END $$;

-- Create storage bucket for avatars if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for avatars
DO $$
BEGIN
  -- Policy for authenticated users to upload their own avatars
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can upload their own avatars'
  ) THEN
    CREATE POLICY "Users can upload their own avatars"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;

  -- Policy for public access to avatars
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Avatar images are publicly accessible'
  ) THEN
    CREATE POLICY "Avatar images are publicly accessible"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'avatars');
  END IF;

  -- Policy for users to update their own avatars
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can update their own avatars'
  ) THEN
    CREATE POLICY "Users can update their own avatars"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;

  -- Policy for users to delete their own avatars
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can delete their own avatars'
  ) THEN
    CREATE POLICY "Users can delete their own avatars"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;