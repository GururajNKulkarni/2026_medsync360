/**
 * Test script to verify file upload functionality works
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFileUpload() {
  console.log('🧪 Testing file upload functionality...\n');
  
  // Test 1: Check if we can list files
  console.log('1. Testing file listing...');
  try {
    const { data: files, error: listError } = await supabase.storage
      .from('referral_attachments')
      .list('', { limit: 5 });
    
    if (listError) {
      console.log('❌ Cannot list files:', listError.message);
    } else {
      console.log(`✅ Can list files: Found ${files?.length || 0} files`);
      if (files && files.length > 0) {
        files.forEach(file => {
          console.log(`   📄 ${file.name}`);
        });
      }
    }
  } catch (error) {
    console.log('❌ File listing exception:', error.message);
  }
  
  // Test 2: Generate a public URL for an existing file
  console.log('\n2. Testing URL generation...');
  try {
    const { data: files } = await supabase.storage
      .from('referral_attachments')
      .list('', { limit: 1 });
    
    if (files && files.length > 0) {
      const fileName = files[0].name;
      const { data: urlData } = supabase.storage
        .from('referral_attachments')
        .getPublicUrl(fileName);
      
      console.log(`✅ Generated URL for ${fileName}:`);
      console.log(`   ${urlData.publicUrl}`);
      
      // Test if URL is accessible
      try {
        const response = await fetch(urlData.publicUrl, { method: 'HEAD' });
        console.log(`✅ URL is accessible (Status: ${response.status})`);
      } catch (fetchError) {
        console.log(`⚠️  URL fetch test failed: ${fetchError.message}`);
      }
    } else {
      console.log('⚠️  No files available to test URL generation');
    }
  } catch (error) {
    console.log('❌ URL generation failed:', error.message);
  }
  
  // Test 3: Test upload with a small text file
  console.log('\n3. Testing file upload...');
  try {
    const testContent = `Test upload at ${new Date().toISOString()}`;
    const fileName = `test-${Date.now()}.txt`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('referral_attachments')
      .upload(fileName, testContent, {
        contentType: 'text/plain'
      });
    
    if (uploadError) {
      console.log('❌ Upload failed:', uploadError.message);
    } else {
      console.log('✅ Upload successful!');
      console.log(`   File: ${uploadData.path}`);
      
      // Generate URL for uploaded file
      const { data: newUrlData } = supabase.storage
        .from('referral_attachments')
        .getPublicUrl(fileName);
      
      console.log(`   URL: ${newUrlData.publicUrl}`);
      
      // Clean up test file
      const { error: deleteError } = await supabase.storage
        .from('referral_attachments')
        .remove([fileName]);
      
      if (deleteError) {
        console.log(`⚠️  Failed to clean up test file: ${deleteError.message}`);
      } else {
        console.log('✅ Test file cleaned up');
      }
    }
  } catch (error) {
    console.log('❌ Upload test exception:', error.message);
  }
  
  // Test 4: Test database connection
  console.log('\n4. Testing database operations...');
  try {
    // Try to create a test referral
    const testReferral = {
      title: 'Test Upload Functionality',
      description: 'Testing file upload system',
      urgency: 'Normal',
      to_department: 'MD General Medicine',
      status: 'Sent',
      attachments: ['test-file.txt']
    };
    
    const { data: referralData, error: referralError } = await supabase
      .from('referrals')
      .insert([testReferral])
      .select()
      .single();
    
    if (referralError) {
      console.log('❌ Database insert failed:', referralError.message);
    } else {
      console.log('✅ Database insert successful!');
      console.log(`   Referral ID: ${referralData.id}`);
      
      // Clean up test referral
      const { error: deleteError } = await supabase
        .from('referrals')
        .delete()
        .eq('id', referralData.id);
      
      if (deleteError) {
        console.log(`⚠️  Failed to clean up test referral: ${deleteError.message}`);
      } else {
        console.log('✅ Test referral cleaned up');
      }
    }
  } catch (error) {
    console.log('❌ Database test exception:', error.message);
  }
  
  console.log('\n📊 Test Summary:');
  console.log('   If all tests show ✅, your upload system should work correctly');
  console.log('   If you see ❌ errors, those areas need attention');
  console.log('\n✅ Upload test completed!');
}

// Run the test
testFileUpload();
