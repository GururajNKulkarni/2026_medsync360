-- Create Chat Attachments Storage Bucket
-- This migration creates the storage bucket and policies needed for chat file attachments

-- Create the storage bucket for chat attachments (private for security)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat_attachments',
  'chat_attachments',
  false, -- Private bucket for security
  52428800, -- 50MB file size limit
  ARRAY[
    'image/jpeg',
    'image/png', 
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip',
    'application/x-zip-compressed'
  ]
) ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for chat attachments

-- Policy 1: Allow authenticated users to upload files to their own folder
CREATE POLICY "Allow authenticated users to upload chat attachments" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'chat_attachments' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 2: Allow users to view files in conversations they participate in
CREATE POLICY "Allow users to view chat attachments" ON storage.objects
FOR SELECT USING (
  bucket_id = 'chat_attachments'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM private_messages pm
    JOIN private_conversations pc ON pm.conversation_id = pc.id
    WHERE pm.content LIKE '%' || name || '%'
    AND pc.participant_ids @> ARRAY[auth.uid()]
  )
);

-- Policy 3: Allow users to delete their own uploaded files
CREATE POLICY "Allow users to delete their own chat attachments" ON storage.objects
FOR DELETE USING (
  bucket_id = 'chat_attachments'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Add comments for documentation
COMMENT ON POLICY "Allow authenticated users to upload chat attachments" ON storage.objects IS 'Allows authenticated users to upload files to their own folder in chat_attachments bucket';
COMMENT ON POLICY "Allow users to view chat attachments" ON storage.objects IS 'Allows users to view files in conversations they participate in';
COMMENT ON POLICY "Allow users to delete their own chat attachments" ON storage.objects IS 'Allows users to delete their own uploaded files'; 