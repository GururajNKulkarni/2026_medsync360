/*
  # Add Elective to referral_urgency enum

  1. Changes
    - Add 'Elective' as a valid value to the referral_urgency enum type
    - This resolves the frontend error when creating referrals with Elective urgency

  2. Notes
    - Uses ALTER TYPE to add the new enum value
    - Safe operation that doesn't affect existing data
*/

-- Add 'Elective' to the referral_urgency enum
ALTER TYPE referral_urgency ADD VALUE 'Elective';