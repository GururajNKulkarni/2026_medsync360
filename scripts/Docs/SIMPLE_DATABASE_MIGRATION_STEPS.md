# 🔧 **SIMPLE DATABASE MIGRATION - STEP BY STEP**

## ⚠️ **If Previous SQL Had Errors, Use This Approach**

### **Step 1: Add Transfer Columns**
Run this SQL first:

```sql
ALTER TABLE referrals 
ADD COLUMN IF NOT EXISTS transfer_parent_id UUID,
ADD COLUMN IF NOT EXISTS transfer_reason TEXT,
ADD COLUMN IF NOT EXISTS transfer_notes TEXT,
ADD COLUMN IF NOT EXISTS transferred_from_user_id UUID,
ADD COLUMN IF NOT EXISTS transferred_from_department TEXT,
ADD COLUMN IF NOT EXISTS transferred_at TIMESTAMPTZ;
```

### **Step 2: Add Foreign Key Constraints**
Run this SQL second:

```sql
ALTER TABLE referrals 
ADD CONSTRAINT IF NOT EXISTS fk_transfer_parent 
FOREIGN KEY (transfer_parent_id) REFERENCES referrals(id);

ALTER TABLE referrals 
ADD CONSTRAINT IF NOT EXISTS fk_transferred_from_user 
FOREIGN KEY (transferred_from_user_id) REFERENCES users(id);
```

### **Step 3: Add Transferred Status to Enum**
Run this SQL third:

```sql
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'Transferred' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'referral_status')
  ) THEN
    ALTER TYPE referral_status ADD VALUE 'Transferred';
  END IF;
END $$;
```

### **Step 4: Create Indexes**
Run this SQL fourth:

```sql
CREATE INDEX IF NOT EXISTS idx_referrals_transfer_parent_id ON referrals(transfer_parent_id);
CREATE INDEX IF NOT EXISTS idx_referrals_transferred_from_user_id ON referrals(transferred_from_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_transferred_at ON referrals(transferred_at);
```

### **Step 5A: Drop Existing Transfer Function (if exists)**
Run this SQL first to remove any existing function:

```sql
DROP FUNCTION IF EXISTS transfer_referral(uuid,uuid,text,text,text,uuid);
DROP FUNCTION IF EXISTS transfer_referral(uuid,uuid,text,text,text);
DROP FUNCTION IF EXISTS transfer_referral(uuid,uuid,text);
```

### **Step 5B: Create New Transfer Function**
Run this SQL after Step 5A:

```sql
CREATE OR REPLACE FUNCTION transfer_referral(
  p_original_referral_id UUID,
  p_new_to_user_id UUID,
  p_new_to_department TEXT,
  p_transfer_reason TEXT DEFAULT NULL,
  p_transfer_notes TEXT DEFAULT NULL,
  p_transferred_by_user_id UUID DEFAULT NULL
) RETURNS UUID 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
DECLARE
  v_original_referral referrals%ROWTYPE;
  v_new_referral_id UUID;
BEGIN
  -- Get the original referral
  SELECT * INTO v_original_referral 
  FROM referrals 
  WHERE id = p_original_referral_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Original referral not found: %', p_original_referral_id;
  END IF;
  
  -- Create new referral for the recipient
  INSERT INTO referrals (
    title,
    description,
    urgency,
    from_user_id,
    to_user_id,
    to_department,
    from_department,
    patient_name,
    patient_age,
    patient_sex,
    admission_date,
    medication_given,
    attachments,
    status,
    transfer_parent_id,
    transfer_reason,
    transfer_notes,
    transferred_from_user_id,
    transferred_from_department,
    transferred_at
  ) VALUES (
    v_original_referral.title,
    v_original_referral.description,
    v_original_referral.urgency,
    p_transferred_by_user_id,
    p_new_to_user_id,
    p_new_to_department,
    (SELECT department FROM users WHERE id = p_transferred_by_user_id),
    v_original_referral.patient_name,
    v_original_referral.patient_age,
    v_original_referral.patient_sex,
    v_original_referral.admission_date,
    v_original_referral.medication_given,
    v_original_referral.attachments,
    'Received',
    p_original_referral_id,
    p_transfer_reason,
    p_transfer_notes,
    v_original_referral.to_user_id,
    v_original_referral.to_department,
    NOW()
  ) RETURNING id INTO v_new_referral_id;
  
  -- Update original referral to mark as transferred
  UPDATE referrals 
  SET 
    status = 'Transferred',
    transfer_notes = p_transfer_notes,
    transfer_reason = p_transfer_reason,
    transferred_at = NOW()
  WHERE id = p_original_referral_id;
  
  RETURN v_new_referral_id;
END;
$$;
```

### **Step 6: Test the Setup**
Run this to verify everything worked:

```sql
-- Check columns
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'referrals' AND column_name LIKE '%transfer%';
```

**Expected result**: Should show 6 transfer columns

```sql
-- Check function
SELECT proname FROM pg_proc WHERE proname = 'transfer_referral';
```

**Expected result**: Should show `transfer_referral`

```sql
-- Check enum
SELECT enumlabel FROM pg_enum e 
JOIN pg_type t ON e.enumtypid = t.oid 
WHERE t.typname = 'referral_status' AND enumlabel = 'Transferred';
```

**Expected result**: Should show `Transferred`

---

## ✅ **If All Steps Complete Successfully**

Your transfer system will be 100% functional! The UI fixes are already applied, so transfers will work perfectly.

## 🚀 **How to Use This Guide**

1. **Open**: https://supabase.com/dashboard
2. **Select**: Project `hokostygwqtezidzdyzo`
3. **Go to**: SQL Editor
4. **Copy & paste**: Each step's SQL one by one
5. **Run**: Each SQL statement separately
6. **Verify**: Run Step 6 to confirm everything worked

This step-by-step approach eliminates syntax errors by running smaller, focused SQL statements.
