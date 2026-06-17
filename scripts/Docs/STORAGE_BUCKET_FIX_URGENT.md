# 🚨 URGENT: Storage Bucket Fix Required

## ❌ **Current Issues Identified:**
- ❌ **Storage Bucket Not Found**: `referral_attachments` bucket doesn't exist
- ❌ **File Preview Broken**: "Image Not Available" error
- ❌ **404 File Access**: Object not found when accessing files
- ❌ **0 Attachment Records**: Database records missing
- ❌ **RLS Policy Block**: Row Level Security preventing bucket creation

---

## 🔧 **IMMEDIATE FIX REQUIRED**

### **Step 1: Apply Storage Bucket Migration**

**Run this SQL in Supabase Dashboard → SQL Editor:**

```sql
-- Create the storage bucket for referral attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('referral_attachments', 'referral_attachments', true)
ON CONFLICT (id) DO UPDATE SET
  public = true;

-- Enable RLS on storage.objects table (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to upload files to referral_attachments bucket
CREATE POLICY "Allow authenticated users to upload referral attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'referral_attachments');

-- Policy: Allow public read access to referral_attachments for viewing
CREATE POLICY "Allow public read access to referral attachments"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'referral_attachments');

-- Policy: Allow authenticated users to update their own files
CREATE POLICY "Allow authenticated users to update their own referral attachments"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'referral_attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy: Allow authenticated users to delete their own files
CREATE POLICY "Allow authenticated users to delete their own referral attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'referral_attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Verify the bucket was created
SELECT id, name, public, created_at
FROM storage.buckets
WHERE id = 'referral_attachments';
```

### **Step 2: Verify Bucket Creation**

After running the SQL, you should see:
```
id                   | name                 | public | created_at
referral_attachments | referral_attachments | true   | 2025-07-19...
```

### **Step 3: Test File Upload**

1. **Go to the referral form**
2. **Try uploading a file** (image, PDF, etc.)
3. **Check the diagnostics** - should now show:
   - ✅ Storage Bucket: **Found**
   - ✅ Storage Permissions: **Accessible**

---

## 🔍 **Root Cause Analysis**

### **Why This Happened:**
1. **Missing Storage Bucket**: The `referral_attachments` bucket was never created in the database
2. **RLS Restrictions**: Row Level Security policies blocked bucket creation via client code
3. **Missing Policies**: No access policies defined for file operations
4. **Public Access**: Bucket wasn't configured for public file viewing

### **What We're Fixing:**
- ✅ **Creating the bucket** in the database
- ✅ **Setting up RLS policies** for secure access
- ✅ **Enabling public read** for file viewing
- ✅ **User-scoped permissions** for upload/delete

---

## 🚀 **Expected Results After Fix:**

### **✅ File Upload Should Work:**
- Upload files successfully to storage
- Files stored in user-organized folders
- Proper database records created

### **✅ File Viewing Should Work:**
- Files display in referral details
- Preview functionality operational
- Download links functional

### **✅ Diagnostics Should Show:**
- Storage Bucket: **Found** ✅
- Attachment Records: **Count > 0** ✅
- RPC Function: **Available** ✅
- Storage Permissions: **Accessible** ✅

---

## 🔧 **Manual Verification Steps:**

### **1. Check Bucket Exists:**
```sql
SELECT * FROM storage.buckets WHERE id = 'referral_attachments';
```

### **2. Check RLS Policies:**
```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';
```

### **3. Test File Upload:**
- Create a new referral
- Attach a small image or PDF
- Submit the referral
- Check if file appears in referral details

### **4. Test File Access:**
- Click on attachment in referral details
- Should open/preview properly
- No 404 errors

---

## 🎯 **Priority Actions:**

### **CRITICAL - Do Immediately:**
1. ⭐ **Apply the SQL migration** above
2. ⭐ **Verify bucket creation** with SELECT query
3. ⭐ **Test file upload** in the application

### **VERIFY - After Migration:**
1. ✅ Verify attachment functionality
2. ✅ Upload test file
3. ✅ View file in referral details
4. ✅ Confirm 0 errors in browser console

---

## 📞 **If Issues Persist:**

### **Common Problems:**
- **Permission Denied**: Check user authentication status
- **Policy Conflicts**: Drop existing policies and recreate
- **Bucket Still Missing**: Verify SQL execution in correct database

### **Debug Commands:**
```sql
-- Check if bucket exists
SELECT COUNT(*) FROM storage.buckets WHERE id = 'referral_attachments';

-- Check policies
SELECT policyname FROM pg_policies WHERE tablename = 'objects';

-- Check for errors in storage
SELECT * FROM storage.objects WHERE bucket_id = 'referral_attachments' LIMIT 5;
```

**🚨 This storage bucket creation is CRITICAL for the attachment system to function. Please apply the migration immediately to resolve all file-related issues.**
