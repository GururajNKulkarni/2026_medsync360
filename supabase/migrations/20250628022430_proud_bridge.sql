/*
  # Update shift types in duty roster

  1. Changes
    - Replace 'On Call' shift type with 'Afternoon'
    - Update shift_type enum to have values: 'Day', 'Afternoon', 'Night'
    - Migrate existing data to use the new values
  
  2. Implementation
    - Create temporary text column
    - Convert existing enum values to text
    - Drop the enum constraint
    - Update values in the text column
    - Create new enum type
    - Convert text column to new enum type
    - Drop temporary column
*/

-- Step 1: Add a temporary column to store the text version of the enum
ALTER TABLE duty_roster ADD COLUMN shift_type_temp TEXT;

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

-- Step 11: Update the SHIFT_CONFIGS in any stored procedures or functions if needed
-- (No stored procedures using these values in this database)