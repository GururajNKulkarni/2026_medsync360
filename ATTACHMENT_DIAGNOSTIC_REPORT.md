# Attachment Diagnostic Report

## Summary of Issues

Based on the diagnostic report, there are several issues with the referral attachment system:

1. **Storage Bucket Configuration**: The storage bucket "referral_attachments" is not found or not properly configured
2. **Attachment Records**: There's a mismatch between the attachments array (1 item) and the attachment records (0 records)
3. **URL Accessibility**: While the URL appears to be accessible, there may be issues with how it's being displayed or loaded in the UI

## Diagnostic Results

| Check | Status | Details |
|-------|--------|---------|
| Referral Exists | ✅ Yes | The referral record exists in the database |
| Attachments Array | ✅ Yes (1 item) | The referral has 1 attachment in its array |
| Attachment Records | ❌ 0 records | No records found in the referral_attachments table |
| RPC Function | ✅ Available | The get_referral_attachments function exists |
| Storage Bucket | ❌ Not Found | The referral_attachments bucket is not found |
| Storage Permissions | ✅ Success | Storage access is working, found 0 files |

## Attachment Details

- **Filename**: 20211030_095821.jpg
- **Status**: Unknown
- **URL**: `https://hokostygwqtezidzdyzo.supabase.co/storage/v1/object/public/referral_attachments/20211030_095821.jpg`
- **Accessibility**: URL appears to be accessible

## Recommended Fixes

### 1. Create and Configure Storage Bucket

```sql
-- Create storage bucket for referral attachments if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'referral_attachments', 
  'referral_attachments', 
  true, -- Make public for easier access
  52428800, -- 50MB limit
  ARRAY[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'text/plain',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'text/plain',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
```

### 2. Set Public Access Policy

```sql
-- Create policy for public access to referral attachments
CREATE POLICY "Public can access referral attachments"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'referral_attachments');
```

### 3. Migrate Attachments from Array to Records

```sql
-- Create function to migrate attachments from array to dedicated table
CREATE OR REPLACE FUNCTION migrate_referral_attachments()
RETURNS void AS $$
DECLARE
  ref RECORD;
  attachment_name text;
BEGIN
  FOR ref IN SELECT id, attachments, from_user_id FROM referrals WHERE attachments IS NOT NULL AND array_length(attachments, 1) > 0
  LOOP
    FOREACH attachment_name IN ARRAY ref.attachments
    LOOP
      -- Check if this attachment already exists in the table
      IF NOT EXISTS (
        SELECT 1 FROM referral_attachments
        WHERE referral_id = ref.id AND file_name = attachment_name
      ) THEN
        -- Insert the attachment into the dedicated table
        INSERT INTO referral_attachments (
          referral_id,
          file_name,
          file_type,
          uploaded_by,
          file_url
        ) VALUES (
          ref.id,
          attachment_name,
          CASE 
            WHEN attachment_name LIKE '%.pdf' THEN 'application/pdf'
            WHEN attachment_name LIKE '%.jpg' OR attachment_name LIKE '%.jpeg' THEN 'image/jpeg'
            WHEN attachment_name LIKE '%.png' THEN 'image/png'
            WHEN attachment_name LIKE '%.doc' OR attachment_name LIKE '%.docx' THEN 'application/msword'
            ELSE 'application/octet-stream'
          END,
          ref.from_user_id,
          'https://hokostygwqtezidzdyzo.supabase.co/storage/v1/object/public/referral_attachments/' || attachment_name
        );
      END IF;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the migration function
SELECT migrate_referral_attachments();
```

### 4. Fix CORS Settings

Ensure your Supabase project has the correct CORS settings:

1. Go to your Supabase project dashboard
2. Navigate to Settings > API
3. Under CORS (Cross-Origin Resource Sharing), add your application's domain to the allowed origins
4. Make sure the "Expose Content-Range header" option is enabled

### 5. Upload the Actual File

If the file doesn't actually exist in storage:

1. Upload the file "20211030_095821.jpg" to the referral_attachments bucket
2. Make sure it's placed in the correct path that matches the URL

## Implementation Steps

1. Run the SQL commands in the Supabase SQL Editor
2. Verify the storage bucket exists and is public
3. Check that the attachment records have been created
4. Test the file URL accessibility again
5. If issues persist, check browser console for CORS errors

## Additional Troubleshooting

If the image still doesn't display properly:

1. **Check Image Format**: Ensure the image is a valid JPEG file
2. **Verify Content Type**: Make sure the file is being served with the correct Content-Type header
3. **Test in Different Browsers**: Try accessing the image in Chrome, Firefox, and Safari
4. **Check Network Tab**: In browser dev tools, look for any errors when loading the image
5. **Try Direct URL**: Open the image URL directly in a browser tab to verify it loads

## Long-term Improvements

1. Implement proper error handling for attachment loading failures
2. Add a fallback image when attachments fail to load
3. Create a more robust attachment upload and management system
4. Add client-side validation for attachment formats and sizes
5. Implement a caching mechanism for frequently accessed attachments