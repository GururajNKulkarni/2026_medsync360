/**
 * Fix bucket public access configuration
 * This addresses the 400 Bad Request issue on file URLs
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // We need service role for bucket operations

if (!supabaseUrl) {
  console.error('❌ Missing VITE_SUPABASE_URL');
  process.exit(1);
}

if (!supabaseServiceKey) {
  console.error('⚠️  Missing SUPABASE_SERVICE_ROLE_KEY - cannot modify bucket settings');
  console.error('To fix bucket configuration, you need service role key');
  console.error('Alternative: Use Supabase Dashboard > Storage > Settings');
  process.exit(1);
}

// Create admin client with service role key
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function fixBucketPublicAccess() {
  console.log('🔧 FIXING BUCKET PUBLIC ACCESS CONFIGURATION\n');
  
  try {
    // 1. Check current bucket configuration
    console.log('=== 1. CHECKING CURRENT BUCKET CONFIGURATION ===');
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Cannot list buckets:', listError.message);
      return;
    }
    
    console.log('Available buckets:', buckets.map(b => `${b.name} (public: ${b.public})`));
    
    const referralBucket = buckets.find(b => b.name === 'referral_attachments');
    
    if (!referralBucket) {
      console.log('⚠️  referral_attachments bucket not found');
      console.log('Creating bucket...');
      
      // Create the bucket
      const { data: createData, error: createError } = await supabaseAdmin.storage.createBucket('referral_attachments', {
        public: true,
        allowedMimeTypes: [
          'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
          'application/pdf', 'application/msword', 
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain'
        ],
        fileSizeLimit: 5 * 1024 * 1024 // 5MB
      });
      
      if (createError) {
        console.error('❌ Failed to create bucket:', createError.message);
        return;
      }
      
      console.log('✅ Bucket created successfully');
    } else {
      console.log(`✅ Bucket exists - Public: ${referralBucket.public}`);
      
      if (!referralBucket.public) {
        console.log('Making bucket public...');
        
        // Update bucket to be public
        const { data: updateData, error: updateError } = await supabaseAdmin.storage.updateBucket('referral_attachments', {
          public: true
        });
        
        if (updateError) {
          console.error('❌ Failed to make bucket public:', updateError.message);
          return;
        }
        
        console.log('✅ Bucket is now public');
      }
    }
    
    // 2. Check storage policies
    console.log('\n=== 2. CHECKING STORAGE POLICIES ===');
    
    // We'll use SQL to check policies
    const { data: policies, error: policyError } = await supabaseAdmin
      .from('pg_policies')
      .select('*')
      .eq('schemaname', 'storage')
      .eq('tablename', 'objects');
    
    if (policyError) {
      console.log('⚠️  Cannot check policies via SQL:', policyError.message);
    } else {
      console.log('Current storage policies:');
      policies.forEach(policy => {
        console.log(`   - ${policy.policyname} (${policy.cmd}) for ${policy.roles}`);
      });
    }
    
    // 3. Test file access after configuration
    console.log('\n=== 3. TESTING FILE ACCESS AFTER CONFIGURATION ===');
    
    // List files to get a test file
    const { data: files, error: filesError } = await supabaseAdmin.storage
      .from('referral_attachments')
      .list('', { limit: 1 });
    
    if (filesError) {
      console.error('❌ Cannot list files:', filesError.message);
      return;
    }
    
    if (files && files.length > 0) {
      const testFile = files[0].name;
      console.log(`Testing access to file: ${testFile}`);
      
      // Generate public URL
      const { data: urlData } = supabaseAdmin.storage
        .from('referral_attachments')
        .getPublicUrl(testFile);
      
      console.log('Generated URL:', urlData.publicUrl);
      
      // Test URL access
      try {
        const response = await fetch(urlData.publicUrl, { method: 'HEAD' });
        console.log(`File access test: ${response.status} ${response.statusText}`);
        
        if (response.status === 200) {
          console.log('✅ File is now publicly accessible!');
        } else if (response.status === 400) {
          console.log('❌ Still getting 400 error - may need manual intervention');
          console.log('Response headers:', Object.fromEntries(response.headers.entries()));
        }
      } catch (fetchError) {
        console.log('❌ Fetch test failed:', fetchError.message);
      }
    } else {
      console.log('⚠️  No files available for testing');
    }
    
    // 4. Upload test
    console.log('\n=== 4. UPLOAD TEST WITH ADMIN CLIENT ===');
    
    const testContent = `Admin upload test at ${new Date().toISOString()}`;
    const testFileName = `admin-test-${Date.now()}.txt`;
    
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('referral_attachments')
      .upload(testFileName, testContent, {
        contentType: 'text/plain'
      });
    
    if (uploadError) {
      console.log('❌ Admin upload failed:', uploadError.message);
    } else {
      console.log('✅ Admin upload successful!');
      
      // Test the uploaded file URL
      const { data: testUrlData } = supabaseAdmin.storage
        .from('referral_attachments')
        .getPublicUrl(testFileName);
      
      try {
        const testResponse = await fetch(testUrlData.publicUrl, { method: 'HEAD' });
        console.log(`New file access: ${testResponse.status} ${testResponse.statusText}`);
        
        if (testResponse.status === 200) {
          console.log('✅ New uploads are publicly accessible!');
        }
      } catch (error) {
        console.log('❌ New file test failed:', error.message);
      }
      
      // Clean up test file
      await supabaseAdmin.storage.from('referral_attachments').remove([testFileName]);
      console.log('✅ Test file cleaned up');
    }
    
  } catch (error) {
    console.error('❌ Configuration fix failed:', error.message);
    console.error('Full error:', error);
  }
  
  console.log('\n=== BUCKET CONFIGURATION FIX COMPLETE ===');
  console.log('If issues persist, check Supabase Dashboard > Storage > Settings');
  console.log('Ensure "Public bucket" is enabled for referral_attachments');
}

fixBucketPublicAccess().catch(console.error);
