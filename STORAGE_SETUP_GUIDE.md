# Storage Setup Guide - Fix for "Image Not Available" Error

## Root Cause Analysis
The "Image Not Available" error occurs because:

1. **Missing Storage Bucket**: The `referral_attachments` bucket doesn't exist
2. **RLS Policies**: Row Level Security prevents automatic bucket creation
3. **Empty Database**: No referrals exist in the database currently
4. **Orphaned Files**: 3 files exist in storage but no corresponding database records

## Manual Storage Bucket Setup

### Step 1: Create Storage Bucket in Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Storage** → **Buckets**
3. Click **"New bucket"**
4. Use these settings:
   ```
   Name: referral_attachments
   Public: Yes (✓ Public bucket)
   File size limit: 5 MB (5242880 bytes)
   Allowed MIME types: 
   - image/*
   - application/pdf
   - application/msword
   - application/vnd.openxmlformats-officedocument.wordprocessingml.document
   - text/plain
   ```

### Step 2: Configure Storage Policies

Navigate to **Storage** → **Policies** and create these policies:

#### Policy 1: Allow Authenticated Upload
```sql
-- Policy Name: Allow authenticated users to upload files
-- Operation: INSERT
-- Target Role: authenticated

-- Policy Definition:
bucket_id = 'referral_attachments' AND auth.role() = 'authenticated'
```

#### Policy 2: Allow Authenticated Read
```sql
-- Policy Name: Allow authenticated users to read files  
-- Operation: SELECT
-- Target Role: authenticated

-- Policy Definition:
bucket_id = 'referral_attachments' AND auth.role() = 'authenticated'
```

#### Policy 3: Allow Public Read (for file URLs)
```sql
-- Policy Name: Allow public read access for file URLs
-- Operation: SELECT  
-- Target Role: public

-- Policy Definition:
bucket_id = 'referral_attachments'
```

### Step 3: Alternative Quick Setup (if manual creation fails)

If you have service role key access, you can also run these SQL commands in the SQL Editor:

```sql
-- Create bucket via SQL (if needed)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'referral_attachments',
  'referral_attachments', 
  true,
  5242880,
  ARRAY['image/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
);

-- Create storage policies
CREATE POLICY "Allow authenticated upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'referral_attachments');

CREATE POLICY "Allow authenticated read" ON storage.objects  
  FOR SELECT TO authenticated
  USING (bucket_id = 'referral_attachments');

CREATE POLICY "Allow public read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'referral_attachments');
```

## Testing the Fix

### Step 1: Verify Bucket Creation
After creating the bucket, run:
```bash
node scripts/database-diagnostics.js
```

You should see:
```
✅ Storage bucket exists: Yes
   Public: true
   File size limit: 5242880
```

### Step 2: Test File Upload
1. Login to the application as Dr. KMC112233
2. Create a new referral
3. Attach a small image file (< 5MB)
4. Submit the referral
5. Verify the upload progress shows success
6. View the referral to confirm attachment displays correctly

### Step 3: Verify Database Records
After creating a referral with attachments, verify functionality:
```bash
node scripts/database-diagnostics.js
```

You should see:
```
📊 Found 1 referrals in total
📊 1 referrals have attachments
📊 Found 1 attachment records
```

## Environment Variables

Ensure your `.env` file has:
```bash
VITE_SUPABASE_URL=your_actual_supabase_url
VITE_SUPABASE_ANON_KEY=your_actual_anon_key
```

## Common Issues & Solutions

### Issue 1: "Bucket not found" error
- **Solution**: Complete Step 1 above to create the bucket manually

### Issue 2: "403 Forbidden" on file upload
- **Solution**: Check storage policies in Step 2

### Issue 3: Files upload but can't be viewed
- **Solution**: Ensure bucket is set to "Public" and public read policy exists

### Issue 4: "Image Not Available" on existing referrals
- **Solution**: This is expected for referrals created before the fix. Only new referrals will work properly.

## File Upload Process Flow (After Fix)

1. **User selects files** → File validation (size, type)
2. **Upload to storage** → Files saved with unique names in `referral_attachments` bucket
3. **Create referral** → Database record created with uploaded filenames
4. **Create attachment records** → Detailed metadata stored in `referral_attachments` table
5. **Generate URLs** → Public URLs generated for file access
6. **Display files** → Users can view/download attachments successfully

## Verification Checklist

- [ ] Storage bucket `referral_attachments` exists and is public
- [ ] Storage policies allow authenticated upload and public read
- [ ] Environment variables are correctly configured  
- [ ] New referrals can be created with file attachments
- [ ] Upload progress indicators work correctly
- [ ] Attached files can be viewed and downloaded
- [ ] Database records are created properly

Once you complete the manual storage setup, the attachment system will work correctly for all new referrals.
