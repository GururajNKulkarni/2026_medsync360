/**
 * Script to set up the referral_attachments storage bucket
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupStorageBucket() {
  console.log('🚀 Setting up referral_attachments storage bucket...\n');
  
  // Check if bucket already exists
  console.log('1. Checking if bucket exists...');
  const { data: existingBucket, error: checkError } = await supabase.storage.getBucket('referral_attachments');
  
  if (existingBucket) {
    console.log('✅ Bucket already exists');
    console.log('   Public:', existingBucket.public);
    console.log('   File size limit:', existingBucket.file_size_limit);
    return true;
  }
  
  if (checkError && !checkError.message.includes('not found')) {
    console.log('❌ Error checking bucket:', checkError.message);
    return false;
  }
  
  // Create the bucket
  console.log('2. Creating storage bucket...');
  const { data: newBucket, error: createError } = await supabase.storage.createBucket('referral_attachments', {
    public: true, // Make it public so files can be accessed directly
    fileSizeLimit: 5242880, // 5MB limit
    allowedMimeTypes: [
      'image/jpeg',
      'image/png', 
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ]
  });
  
  if (createError) {
    console.log('❌ Error creating bucket:', createError.message);
    return false;
  }
  
  console.log('✅ Storage bucket created successfully');
  console.log('   ID:', newBucket.name);
  console.log('   Public: true');
  console.log('   File size limit: 5MB');
  
  // Set up storage policies (if needed)
  console.log('\n3. Setting up storage policies...');
  console.log('ℹ️  Note: You may need to configure RLS policies in your Supabase dashboard');
  console.log('   Recommended policies:');
  console.log('   - Allow authenticated users to upload files');
  console.log('   - Allow authenticated users to view files');
  console.log('   - Allow public read access for file URLs');
  
  return true;
}

async function main() {
  console.log('🔧 Storage Setup Script\n');
  
  try {
    const success = await setupStorageBucket();
    if (success) {
      console.log('\n✅ Storage setup completed successfully!');
      console.log('\n📝 Next steps:');
      console.log('   1. Verify bucket permissions in Supabase dashboard');
      console.log('   2. Test file upload functionality');
      console.log('   3. Create a new referral with attachments');
    } else {
      console.log('\n❌ Storage setup failed. Please check your Supabase configuration.');
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the script
main();
