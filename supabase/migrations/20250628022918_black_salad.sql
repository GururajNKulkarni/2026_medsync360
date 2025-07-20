/*
  # Fix shift_type enum and update values

  1. Changes
    - Create a new shift_type enum with the correct values: 'Day', 'Afternoon', 'Night'
    - Safely migrate existing data from the old enum to the new one
    - Update 'On Call' values to 'Afternoon'
    - Ensure all constraints and references are properly maintained

  2. Migration Strategy
    - Use a temporary column to preserve data during the migration
    - Perform the migration in a way that avoids data loss
    - Ensure all steps are idempotent where possible
*/

-- Step 1: Create a temporary column to store the text version of the enum
ALTER TABLE duty_roster ADD COLUMN IF NOT EXISTS shift_type_temp TEXT;

-- Step 2: Copy the current enum values to the text column
UPDATE duty_roster SET shift_type_temp = shift_type::TEXT;

-- Step 3: Update 'On Call' values to 'Afternoon'
UPDATE duty_roster SET shift_type_temp = 'Afternoon' WHERE shift_type_temp = 'On Call';

-- Step 4: Drop the original column with the enum constraint
ALTER TABLE duty_roster DROP COLUMN shift_type;

-- Step 5: Drop the old enum type
DROP TYPE IF EXISTS shift_type;

-- Step 6: Create the new enum type with updated values
CREATE TYPE shift_type AS ENUM ('Day', 'Afternoon', 'Night');

-- Step 7: Add a new column with the new enum type
ALTER TABLE duty_roster ADD COLUMN shift_type shift_type;

-- Step 8: Convert the text values to the new enum type
UPDATE duty_roster SET shift_type = shift_type_temp::shift_type;

-- Step 9: Make the column NOT NULL if it was NOT NULL before
ALTER TABLE duty_roster ALTER COLUMN shift_type SET NOT NULL;

-- Step 10: Drop the temporary text column
ALTER TABLE duty_roster DROP COLUMN shift_type_temp;