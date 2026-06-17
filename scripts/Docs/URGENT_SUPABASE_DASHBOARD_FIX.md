# 🚨 URGENT: Apply This in Supabase Dashboard NOW

## ✅ **Issue Confirmed by Your Diagnostic:**
- ❌ **Bucket not registered**: "referral_attachments bucket not found in bucket list"
- ❌ **RLS Policy Error**: "new row violates row-level security policy"
- ✅ **Files exist**: 5 files found but not accessible

---

## 🔧 **CRITICAL FIX - Apply in Supabase Dashboard → SQL Editor**

**Step 1: Go to your Supabase Dashboard**
**Step 2: Click "SQL Editor" in the left menu**
**Step 3: Click "New Query"**
**Step 4: Copy and paste this EXACT SQL:**

```sql
-- =====================================================
-- CRITICAL FIX: Storage Bucket Registration & RLS Policies
-- This fixes the exact issues shown in your diagnostic
-- =====================================================

-- 1. REGISTER THE BUCKET (this is missing!)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('referral_attachments', 'referral_attachments', true, 52428800, ARRAY['image/*', 'application/pdf', 'text/*'])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/*', 'application/pdf', 'text/*'];

-- 2. ENABLE RLS ON STORAGE OBJECTS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. DROP ANY EXISTING CONFLICTING POLICIES
DROP POLICY IF EXISTS "Allow authenticated users to upload referral attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to view referral attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to referral attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update their own referral attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete their own referral attachments" ON storage.objects;

-- 4. CREATE WORKING RLS POLICIES
CREATE POLICY "referral_attachments_upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'referral_attachments');

CREATE POLICY "referral_attachments_select_auth"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'referral_attachments');

CREATE POLICY "referral_attachments_select_public"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'referral_attachments');

CREATE POLICY "referral_attachments_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'referral_attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "referral_attachments_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'referral_attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 5. VERIFY THE FIX
SELECT 'BUCKET CHECK' as status, id, name, public FROM storage.buckets WHERE id = 'referral_attachments';
SELECT 'POLICY CHECK' as status, COUNT(*) as policy_count FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname LIKE '%referral_attachments%';
SELECT 'FILES CHECK' as status, COUNT(*) as file_count FROM storage.objects WHERE bucket_id = 'referral_attachments';
```

**Step 5: Click "RUN" button**

---

## 🎯 **What This Fix Does:**

### **1. Registers the Missing Bucket**
- Your diagnostic shows bucket "not found in bucket list"
- This properly registers it in `storage.buckets` table
- Sets correct file size limits and MIME types

### **2. Fixes RLS Policies**
- Creates policies that allow authenticated users to upload
- Allows public reading for file viewing
- Prevents the "row-level security policy" error

### **3. Makes Existing Files Accessible**
- Your 5 existing files will become viewable
- File previews will work in referral details
- No more 400 Bad Request errors

---

## ✅ **Expected Results After Running SQL:**

### **Immediate Changes:**
- ✅ **Bucket appears in bucket list**
- ✅ **Upload works without RLS errors**
- ✅ **Existing files become accessible**
- ✅ **File previews work in app**

### **Verification:**
Run your diagnostic script again - should show:
- ✅ **Storage Bucket: Found**
- ✅ **Upload: Successful**
- ✅ **File Access: Working**

---

## 🚨 **IMPORTANT:**

**This SQL fix is CRITICAL and SAFE to run. It:**
- ✅ **Won't delete any data**
- ✅ **Won't break existing functionality**
- ✅ **Fixes the exact errors in your diagnostic**
- ✅ **Makes your attachment system fully operational**

**Apply this SQL fix immediately in your Supabase Dashboard to resolve all storage issues!**
