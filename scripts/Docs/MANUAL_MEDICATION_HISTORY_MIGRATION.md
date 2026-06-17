# Manual Medication History Migration Guide

## 🚨 **IMMEDIATE ACTION REQUIRED**

The automatic migration script failed due to insufficient permissions. Please follow these manual steps to apply the medication history migration through your Supabase dashboard.

## 📋 **Step-by-Step Manual Migration**

### Step 1: Access Supabase Dashboard
1. Go to your Supabase project dashboard: [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **SQL Editor** in the left sidebar

### Step 2: Copy Migration SQL
Copy the following SQL code and paste it into the SQL Editor:

```sql
-- ================================================
-- MEDICATION HISTORY TRACKING MIGRATION
-- File: 20250726160000_create_medication_history.sql
-- ================================================

-- Create enum for medication update types
DO $$ BEGIN
    CREATE TYPE medication_update_type AS ENUM (
        'initial',
        'completion_update', 
        'transfer_update',
        'manual_update'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create medication_history table
CREATE TABLE IF NOT EXISTS medication_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    referral_id UUID NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
    medication_text TEXT NOT NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    update_type medication_update_type NOT NULL DEFAULT 'manual_update',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_medication_history_referral_id ON medication_history(referral_id);
CREATE INDEX IF NOT EXISTS idx_medication_history_updated_at ON medication_history(updated_at);
CREATE INDEX IF NOT EXISTS idx_medication_history_update_type ON medication_history(update_type);

-- Add new columns to referrals table
ALTER TABLE referrals 
ADD COLUMN IF NOT EXISTS last_medication_update TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS medication_update_count INTEGER DEFAULT 0;

-- Create index on new referrals columns
CREATE INDEX IF NOT EXISTS idx_referrals_last_medication_update ON referrals(last_medication_update);

-- Create trigger function to update referrals table when medication history changes
CREATE OR REPLACE FUNCTION update_referral_medication_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update referrals table with latest medication update info
    UPDATE referrals 
    SET 
        last_medication_update = NEW.updated_at,
        medication_update_count = (
            SELECT COUNT(*) 
            FROM medication_history 
            WHERE referral_id = NEW.referral_id
        )
    WHERE id = NEW.referral_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on medication_history table
DROP TRIGGER IF EXISTS trigger_update_referral_medication_stats ON medication_history;
CREATE TRIGGER trigger_update_referral_medication_stats
    AFTER INSERT OR UPDATE ON medication_history
    FOR EACH ROW
    EXECUTE FUNCTION update_referral_medication_stats();

-- Set up Row Level Security (RLS) for medication_history table
ALTER TABLE medication_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view medication history for referrals they're involved in
CREATE POLICY IF NOT EXISTS "Users can view medication history for their referrals" ON medication_history
    FOR SELECT USING (
        referral_id IN (
            SELECT id FROM referrals 
            WHERE from_user_id = auth.uid() 
            OR to_user_id = auth.uid()
        )
    );

-- Policy: Users can insert medication history for referrals they're involved in
CREATE POLICY IF NOT EXISTS "Users can insert medication history for their referrals" ON medication_history
    FOR INSERT WITH CHECK (
        referral_id IN (
            SELECT id FROM referrals 
            WHERE from_user_id = auth.uid() 
            OR to_user_id = auth.uid()
        )
    );

-- Policy: Users can update medication history they created
CREATE POLICY IF NOT EXISTS "Users can update their own medication history" ON medication_history
    FOR UPDATE USING (
        updated_by = auth.uid()
        AND referral_id IN (
            SELECT id FROM referrals 
            WHERE from_user_id = auth.uid() 
            OR to_user_id = auth.uid()
        )
    );

-- Initialize medication_update_count for existing referrals
UPDATE referrals 
SET medication_update_count = 0 
WHERE medication_update_count IS NULL;

-- Create initial medication history entries for existing referrals with medication
INSERT INTO medication_history (referral_id, medication_text, update_type, updated_at)
SELECT 
    id,
    medication_given,
    'initial',
    created_at
FROM referrals 
WHERE medication_given IS NOT NULL 
AND medication_given != ''
AND id NOT IN (SELECT DISTINCT referral_id FROM medication_history);

-- Update last_medication_update for referrals that have medication history
UPDATE referrals 
SET last_medication_update = (
    SELECT MAX(updated_at) 
    FROM medication_history 
    WHERE medication_history.referral_id = referrals.id
)
WHERE id IN (SELECT DISTINCT referral_id FROM medication_history);
```

### Step 3: Execute the Migration
1. Paste the SQL code into the SQL Editor
2. Click **"Run"** button to execute the migration
3. Wait for the confirmation message: **"Success. No rows returned"**

### Step 4: Verify Migration Success
Run these verification queries one by one:

#### 4.1: Check if tables were created
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'medication_history';
```
**Expected Result**: Should return one row with `medication_history`

#### 4.2: Check if new columns were added
```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'referrals' 
AND column_name IN ('last_medication_update', 'medication_update_count');
```
**Expected Result**: Should return two rows with the column names

#### 4.3: Check if enum type was created
```sql
SELECT unnest(enum_range(NULL::medication_update_type));
```
**Expected Result**: Should return four rows: `initial`, `completion_update`, `transfer_update`, `manual_update`

#### 4.4: Test medication history access
```sql
SELECT COUNT(*) FROM medication_history;
```
**Expected Result**: Should return a count (may be 0 if no existing referrals had medication)

### Step 5: Test RLS Policies
```sql
-- This should work (shows policies are active)
SELECT * FROM medication_history LIMIT 1;
```

## ✅ **Success Criteria**

After completing the migration, you should have:
- ✅ `medication_history` table created
- ✅ New columns added to `referrals` table
- ✅ RLS policies active and working
- ✅ Triggers functioning for automatic updates
- ✅ Initial medication history data migrated

## 🔧 **If Migration Fails**

### Common Issues & Solutions:

#### Issue 1: "Permission denied" errors
**Solution**: Make sure you're logged in as the project owner or have sufficient database permissions.

#### Issue 2: "Column already exists" errors  
**Solution**: The migration is idempotent. These warnings can be ignored if columns already exist.

#### Issue 3: "Relation does not exist" errors
**Solution**: Ensure your `referrals` and `users` tables exist before running the migration.

### Rollback (if needed):
```sql
-- ONLY USE IF YOU NEED TO ROLLBACK
DROP TABLE IF EXISTS medication_history;
DROP TYPE IF EXISTS medication_update_type;
ALTER TABLE referrals DROP COLUMN IF EXISTS last_medication_update;
ALTER TABLE referrals DROP COLUMN IF EXISTS medication_update_count;
```

## 🎉 **After Successful Migration**

1. **Restart your development server**: `npm run dev`
2. **Test the application**: Create a referral with medication
3. **Verify tracking**: Complete a referral and check medication history
4. **Check the UI**: Ensure medication timeline displays correctly

## 📞 **Need Help?**

If you encounter any issues:
1. Check the Supabase dashboard logs for detailed error messages
2. Verify your database permissions
3. Ensure all referenced tables (`referrals`, `users`) exist
4. Contact support if problems persist

---

**Migration File**: `supabase/migrations/20250726160000_create_medication_history.sql`  
**Estimated Time**: 5-10 minutes  
**Risk Level**: Low (migration is reversible)
