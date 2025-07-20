/*
  # Update shift types in duty roster system

  1. Changes
    - Modify the shift_type enum to replace 'On Call' with 'Afternoon'
    - This migration updates the shift type options to match the new schedule requirements

  2. New Shift Schedule
    - Day: 8:00 AM - 4:00 PM (unchanged)
    - Afternoon: 4:00 PM - 12:00 AM (replaces On Call)
    - Night: 12:00 AM - 8:00 AM (updated time range)
*/

-- Create a new enum type with the updated values
CREATE TYPE shift_type_new AS ENUM ('Day', 'Afternoon', 'Night');

-- Update existing records to use the new values
UPDATE duty_roster 
SET shift_type = 'Afternoon'::text::shift_type
WHERE shift_type = 'On Call';

-- Alter the table to use the new enum type
ALTER TABLE duty_roster 
  ALTER COLUMN shift_type TYPE shift_type_new 
  USING shift_type::text::shift_type_new;

-- Drop the old enum type
DROP TYPE shift_type;

-- Rename the new enum type to the original name
ALTER TYPE shift_type_new RENAME TO shift_type;