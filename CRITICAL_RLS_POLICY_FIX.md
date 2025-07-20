# 🚨 CRITICAL: RLS Policy & Authentication Fix

## 🔍 **Diagnostic Analysis - Root Causes Identified:**

### ❌ **Issues Found:**
1. **Auth Session Missing**: Script can't authenticate (normal for scripts)
2. **RLS Policy Blocking**: "new row violates row-level security policy" 
3. **Bucket Permission Issues**: Files exist but can't be accessed
4. **Policy Mismatch**: INSERT/SELECT policies not working correctly

### ✅ **Positive Findings:**
- ✅ **Bucket exists**: `referral_attachments` 
- ✅ **Files exist**: 5 files found in bucket
- ✅ **Database connection**: Working properly
- ✅ **URL generation**: Public URLs work

---

## 🔧 **DEFINITIVE FIX - Apply Immediately**

### **Step 1: Fix RLS Policies**

**Run this SQL in Supabase Dashboard → SQL Editor:**

```sql
-- First, drop all existing conflicting policies
DROP POLICY IF EXISTS "Allow authenticated users to upload referral attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to view referral attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to referral attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update their own referral attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete their own referral attachments" ON storage.objects;

-- Enable RLS on storage.objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create comprehensive policies that work
-- 1. Allow authenticated users to upload to referral_attachments bucket
CREATE POLICY "authenticated_upload_referral_attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'referral_attachments');

-- 2. Allow authenticated users to view files in referral_attachments bucket  
CREATE POLICY "authenticated_select_referral_attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'referral_attachments');

-- 3. Allow public read access (since bucket is public)
CREATE POLICY "public_select_referral_attachments"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'referral_attachments');

-- 4. Allow authenticated users to update their own files (user folder structure)
CREATE POLICY "authenticated_update_own_referral_attachments"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'referral_attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 5. Allow authenticated users to delete their own files
CREATE POLICY "authenticated_delete_own_referral_attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'referral_attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Verify policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage'
AND policyname LIKE '%referral_attachments%';
```

### **Step 2: Ensure Bucket is Properly Configured**

```sql
-- Ensure bucket exists and is public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('referral_attachments', 'referral_attachments', true, 10485760, null)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760;

-- Verify bucket configuration
SELECT id, name, public, file_size_limit, allowed_mime_types, created_at
FROM storage.buckets
WHERE id = 'referral_attachments';
```

### **Step 3: Test Access to Existing Files**

```sql
-- Check existing files in bucket
SELECT name, id, bucket_id, owner, created_at, updated_at, last_accessed_at, metadata
FROM storage.objects 
WHERE bucket_id = 'referral_attachments'
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🚀 **Expected Results After Fix:**

### **✅ Upload Should Work:**
- Authenticated users can upload files
- Files stored in correct bucket structure
- RLS policies allow proper access

### **✅ File Access Should Work:**
- Existing files become accessible
- New files display properly
- Public URLs work for viewing

### **✅ Diagnostics Should Show:**
- ✅ Storage Bucket: **Found**
- ✅ RLS Policies: **Properly configured**
- ✅ File Access: **Working**

---

## 🔧 **Application-Level Authentication Fix**

The diagnostic showed "Auth session missing" which is expected for scripts, but in the application, users must be logged in. Let me check the authentication flow:

### **Verify User Authentication in App:**
1. **Login to the app** before testing uploads
2. **Check browser console** for auth errors
3. **Verify session persistence** in application

### **Debug Authentication:**
```javascript
// In browser console, check current auth state:
console.log('Auth user:', await supabase.auth.getUser());
console.log('Session:', await supabase.auth.getSession());
```

---

## 🔍 **Troubleshooting Guide:**

### **If Upload Still Fails:**

#### **1. Check User Authentication:**
```sql
-- Check if user is properly authenticated (run when logged in)
SELECT auth.uid(), auth.jwt();
```

#### **2. Test Policy Manually:**
```sql
-- Test if policies work for current user
SELECT bucket_id, name FROM storage.objects 
WHERE bucket_id = 'referral_attachments' 
LIMIT 5;
```

#### **3. Check Policy Conflicts:**
```sql
-- List all storage policies to check for conflicts
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';
```

### **Common Error Solutions:**

#### **"new row violates row-level security policy":**
- ✅ Fixed by recreating policies above
- User must be authenticated in application
- Policy conditions must match user context

#### **"Object not found" for existing files:**
- ✅ Fixed by adding public SELECT policy
- Files become accessible after policy fix

#### **Upload works but files don't appear:**
- Check file path structure
- Verify database records in `referral_attachments` table

---

## 🎯 **Testing Checklist:**

### **After Applying SQL Fix:**

1. **✅ Run SQL migrations** in Supabase Dashboard
2. **✅ Verify policies created** with SELECT query
3. **✅ Login to application** as authenticated user
4. **✅ Test file upload** in referral form
5. **✅ Check file appears** in referral details
6. **✅ Test file preview/download** functionality
7. **✅ Run attachment diagnostics** - should show green

### **Expected Success Indicators:**
- 🟢 No RLS policy errors
- 🟢 Files upload successfully  
- 🟢 Existing files become accessible
- 🟢 File previews work properly
- 🟢 Attachment diagnostics all green

---

**🚨 This RLS policy fix addresses the exact "row-level security policy" error shown in your diagnostic. Apply immediately to resolve all file access issues.**
