/*
  # Fix Referral Schema and Status Handling

  1. New Columns
    - `patient_name` (text) - Explicit patient name field
    - `patient_age` (integer) - Patient age
    - `patient_sex` (text) - Patient sex with check constraint
    - `admission_date` (date) - Patient admission date
  
  2. Status Enum Updates
    - Add 'Accepted' and 'Closed' values to referral_status enum
  
  3. Security
    - Maintain existing RLS policies
*/

-- Add patient-specific columns if they don't exist
DO $$ 
BEGIN
  -- Add patient_name column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'referrals' AND column_name = 'patient_name'
  ) THEN
    ALTER TABLE referrals ADD COLUMN patient_name text;
  END IF;

  -- Add patient_age column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'referrals' AND column_name = 'patient_age'
  ) THEN
    ALTER TABLE referrals ADD COLUMN patient_age integer;
  END IF;

  -- Add patient_sex column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'referrals' AND column_name = 'patient_sex'
  ) THEN
    ALTER TABLE referrals ADD COLUMN patient_sex text;
    -- Add check constraint for sex values
    ALTER TABLE referrals ADD CONSTRAINT referrals_patient_sex_check 
      CHECK (patient_sex IN ('Male', 'Female', 'Other'));
  END IF;

  -- Add admission_date column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'referrals' AND column_name = 'admission_date'
  ) THEN
    ALTER TABLE referrals ADD COLUMN admission_date date;
  END IF;
END $$;

-- Update referral_status enum to include 'Accepted' and 'Closed' if they don't exist
DO $$ 
BEGIN
  -- Check if 'Accepted' value exists in the enum
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'Accepted' AND 
          enumtypid = (SELECT oid FROM pg_type WHERE typname = 'referral_status')
  ) THEN
    -- Add 'Accepted' value to the enum
    ALTER TYPE referral_status ADD VALUE IF NOT EXISTS 'Accepted';
  END IF;

  -- Check if 'Closed' value exists in the enum
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'Closed' AND 
          enumtypid = (SELECT oid FROM pg_type WHERE typname = 'referral_status')
  ) THEN
    -- Add 'Closed' value to the enum
    ALTER TYPE referral_status ADD VALUE IF NOT EXISTS 'Closed';
  END IF;
END $$;

-- Create migration function to move data from metadata to explicit columns
CREATE OR REPLACE FUNCTION migrate_referral_metadata()
RETURNS void AS $$
DECLARE
  ref RECORD;
  meta_data JSONB;
BEGIN
  FOR ref IN SELECT id, metadata FROM referrals WHERE metadata IS NOT NULL
  LOOP
    meta_data := ref.metadata;
    
    -- Update patient_name if not set and exists in metadata
    IF meta_data ? 'patientName' THEN
      UPDATE referrals 
      SET patient_name = meta_data->>'patientName'
      WHERE id = ref.id AND (patient_name IS NULL OR patient_name = '');
    END IF;
    
    -- Update patient_age if not set and exists in metadata
    IF meta_data ? 'age' THEN
      BEGIN
        UPDATE referrals 
        SET patient_age = (meta_data->>'age')::integer
        WHERE id = ref.id AND patient_age IS NULL;
      EXCEPTION WHEN OTHERS THEN
        -- Handle conversion errors
        NULL;
      END;
    END IF;
    
    -- Update patient_sex if not set and exists in metadata
    IF meta_data ? 'sex' THEN
      UPDATE referrals 
      SET patient_sex = meta_data->>'sex'
      WHERE id = ref.id AND patient_sex IS NULL;
    END IF;
    
    -- Update admission_date if not set and exists in metadata
    IF meta_data ? 'admissionDate' THEN
      BEGIN
        UPDATE referrals 
        SET admission_date = (meta_data->>'admissionDate')::date
        WHERE id = ref.id AND admission_date IS NULL;
      EXCEPTION WHEN OTHERS THEN
        -- Handle conversion errors
        NULL;
      END;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Run the migration function
SELECT migrate_referral_metadata();

-- Create function to map UI status to database status
CREATE OR REPLACE FUNCTION map_ui_status_to_db(ui_status TEXT)
RETURNS referral_status AS $$
BEGIN
  CASE ui_status
    WHEN 'Accepted' THEN RETURN 'Acknowledged'::referral_status;
    WHEN 'Closed' THEN RETURN 'Closed'::referral_status;
    ELSE RETURN ui_status::referral_status;
  END CASE;
EXCEPTION WHEN OTHERS THEN
  RETURN 'Sent'::referral_status;
END;
$$ LANGUAGE plpgsql;

-- Create function to map database status to UI status
CREATE OR REPLACE FUNCTION map_db_status_to_ui(db_status referral_status)
RETURNS TEXT AS $$
BEGIN
  CASE db_status
    WHEN 'Acknowledged' THEN RETURN 'Accepted';
    ELSE RETURN db_status::TEXT;
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION map_ui_status_to_db(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION map_db_status_to_ui(referral_status) TO authenticated;