# 🔧 Bucket Configuration Fix Guide

## Issue Identified
The `referral_attachments` bucket exists but lacks proper public access configuration, causing **400 Bad Request** errors when accessing file URLs.

## 🎯 **Solution 1: Supabase Dashboard (Recommended)**

### Step-by-Step Instructions:

1. **Open Supabase Dashboard**
   - Go to [app.supabase.com](https://app.supabase.com)
   - Select your project: `hokostygwqtezidzdyzo`

2. **Navigate to Storage**
   - Click **Storage** in the left sidebar
   - You should see `referral_attachments` bucket

3. **Configure Bucket Settings**
   - Click on `referral_attachments` bucket
   - Click **Settings** (gear icon)
   - **Enable "Public bucket"** toggle
   - Click **Save**

4. **Verify Configuration**
   - The bucket should now show as "Public"
   - Files should be accessible via their URLs

---

## 🎯 **Solution 2: SQL Commands (Alternative)**

If the dashboard method doesn't work, run these SQL commands in **Supabase Dashboard → SQL Editor**:

### 1. Make Bucket Public
```sql
-- Update the bucket to be public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'referral_attachments';
```

### 2. Create Public Access Policy
```sql
-- Ensure public read access policy exists
DO $$
BEGIN
    -- Drop existing policy if it exists
    DROP POLICY IF EXISTS "Public can access referral attachments" ON storage.objects;
    
    -- Create new public access policy
    CREATE POLICY "Public can access referral attachments"
        ON storage.objects FOR SELECT
        TO public
        USING (bucket_id = 'referral_attachments');
END $$;
```

### 3. Verify Bucket Configuration
```sql
-- Check bucket status
SELECT 
    id as bucket_name,
    public,
    created_at,
    updated_at
FROM storage.buckets 
WHERE id = 'referral_attachments';
```

### 4. Check Policies
```sql
-- List all storage policies
SELECT 
    policyname,
    cmd,
    qual,
    roles
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%referral%';
```

---

## 🧪 **Verification Steps**

After applying either solution:

1. **Run Test Script**
   ```bash
   node scripts/comprehensive-upload-test.js
   ```

2. **Check for These Results:**
   - ✅ File URL access shows `200 OK` (instead of `400 Bad Request`)
   - ✅ Files are publicly accessible
   - ✅ New uploads work for authenticated users

3. **Expected Output:**
   ```
   === 5. URL GENERATION TEST ===
   Testing URL generation for: [filename]
   ✅ Public URL generated: [url]
   Testing URL accessibility...
   ✅ URL accessible - Status: 200 OK  <- This should change from 400
   ```

---

## 📋 **Troubleshooting**

### If files still return 400 errors:

1. **Check CORS Settings**
   - In Storage settings, verify CORS allows your domain
   - Add `*` for testing or your specific domain

2. **Verify File Paths**
   - Files should be accessible at: 
   - `https://hokostygwqtezidzdyzo.supabase.co/storage/v1/object/public/referral_attachments/[filename]`

3. **Clear Browser Cache**
   - Hard refresh the page (Ctrl+F5)
   - Test in incognito mode

### If uploads still fail:

1. **Authentication Required**
   - Users must be logged in to upload files
   - RLS policies prevent anonymous uploads (this is correct)

2. **File Size/Type Limits**
   - Maximum 5MB per file
   - Allowed types: Images, PDF, DOC, TXT

---

## 🎉 **Expected Results After Fix**

✅ **File Access**: Existing files become publicly accessible
✅ **New Uploads**: Work for authenticated users in the app  
✅ **URL Generation**: Returns working public URLs
✅ **Error Resolution**: No more "Image Not Available" errors

The attachment system is fully implemented - it just needs this bucket configuration fix to work properly!
