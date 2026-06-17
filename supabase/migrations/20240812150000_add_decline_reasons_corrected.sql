-- Corrected Migration to Add Decline Reasons
-- Fixes the RLS policy to correctly reference the referral_id

-- Create a new table to store the reasons for declining a referral
CREATE TABLE IF NOT EXISTS referral_decline_reasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_id UUID NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
    reason_code TEXT NOT NULL, -- e.g., 'incorrect_details', 'other'
    reason_text TEXT, -- For 'other' reasons
    declined_by UUID NOT NULL REFERENCES users(id),
    declined_at TIMESTAMPTZ DEFAULT now()
);

-- Add a new column to the referrals table to link to the decline reason
ALTER TABLE referrals
ADD COLUMN IF NOT EXISTS decline_reason_id UUID REFERENCES referral_decline_reasons(id);

-- Create an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_referral_decline_reasons_referral_id ON referral_decline_reasons(referral_id);

-- Enable RLS on the new table
ALTER TABLE referral_decline_reasons ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view decline reasons for referrals they are part of" ON referral_decline_reasons;
DROP POLICY IF EXISTS "Users can insert a decline reason for a referral they are part of" ON referral_decline_reasons;

-- RLS Policies for the new table (Corrected)
CREATE POLICY "Users can view decline reasons for referrals they are part of"
    ON referral_decline_reasons
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM referrals r
            WHERE r.id = referral_decline_reasons.referral_id
            AND (r.from_user_id = auth.uid() OR r.to_user_id = auth.uid())
        )
    );

CREATE POLICY "Users can insert a decline reason for a referral they are part of"
    ON referral_decline_reasons
    FOR INSERT
    TO authenticated
    WITH CHECK (
        declined_by = auth.uid() AND
        EXISTS (
            SELECT 1 FROM referrals r
            WHERE r.id = referral_decline_reasons.referral_id
            AND r.to_user_id = auth.uid()
        )
    );

