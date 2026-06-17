const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables. Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupChatAttachmentsBucket() {
  console.log('🚀 Setting up chat_attachments storage bucket...');

  try {
    // Create the storage bucket
    const { data: bucketData, error: bucketError } = await supabase.storage.createBucket('chat_attachments', {
      public: false, // Private bucket for security
      fileSizeLimit: 52428800, // 50MB
      allowedMimeTypes: [
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
    });

    if (bucketError) {
      if (bucketError.message.includes('already exists')) {
        console.log('✅ chat_attachments bucket already exists');
      } else {
        throw bucketError;
      }
    } else {
      console.log('✅ chat_attachments bucket created successfully');
    }

    // Create RLS policies
    console.log('🔐 Creating RLS policies...');

    // Policy 1: Allow authenticated users to upload files to their own folder
    const { error: uploadPolicyError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY IF NOT EXISTS "Allow authenticated users to upload chat attachments" ON storage.objects
        FOR INSERT WITH CHECK (
          bucket_id = 'chat_attachments' 
          AND auth.role() = 'authenticated'
          AND (storage.foldername(name))[1] = auth.uid()::text
        );
      `
    });

    if (uploadPolicyError) {
      console.log('ℹ️ Upload policy already exists or error:', uploadPolicyError.message);
    } else {
      console.log('✅ Upload policy created');
    }

    // Policy 2: Allow users to view files in conversations they participate in
    const { error: viewPolicyError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY IF NOT EXISTS "Allow users to view chat attachments" ON storage.objects
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
      `
    });

    if (viewPolicyError) {
      console.log('ℹ️ View policy already exists or error:', viewPolicyError.message);
    } else {
      console.log('✅ View policy created');
    }

    // Policy 3: Allow users to delete their own uploaded files
    const { error: deletePolicyError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY IF NOT EXISTS "Allow users to delete their own chat attachments" ON storage.objects
        FOR DELETE USING (
          bucket_id = 'chat_attachments'
          AND auth.role() = 'authenticated'
          AND (storage.foldername(name))[1] = auth.uid()::text
        );
      `
    });

    if (deletePolicyError) {
      console.log('ℹ️ Delete policy already exists or error:', deletePolicyError.message);
    } else {
      console.log('✅ Delete policy created');
    }

    console.log('🎉 Chat attachments storage setup completed successfully!');
    console.log('📋 Summary:');
    console.log('   - Storage bucket: chat_attachments (private)');
    console.log('   - File size limit: 50MB');
    console.log('   - Supported types: Images, PDF, DOC, TXT, CSV, Excel, ZIP');
    console.log('   - RLS policies: Upload, View, Delete');

  } catch (error) {
    console.error('❌ Error setting up chat attachments storage:', error);
    process.exit(1);
  }
}

setupChatAttachmentsBucket(); 