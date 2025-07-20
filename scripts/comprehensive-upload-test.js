/**
 * Comprehensive upload test with detailed error tracking
 * This script will provide all the details needed for troubleshooting
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

// Create client with enhanced configuration (following our updates)
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

async function comprehensiveUploadTest() {
  console.log('🔍 COMPREHENSIVE UPLOAD DIAGNOSTIC TEST\n');
  
  // 1. CLIENT CONFIGURATION
  console.log('=== 1. CLIENT CONFIGURATION ===');
  console.log('Supabase URL:', supabaseUrl);
  console.log('Anon Key (first 20 chars):', supabaseKey.substring(0, 20) + '...');
  console.log('Client configured with auth options:', {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  });
  
  // 2. AUTHENTICATION STATUS
  console.log('\n=== 2. AUTHENTICATION STATUS ===');
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.log('❌ User auth error:', userError.message);
      console.log('Full error object:', JSON.stringify(userError, null, 2));
    } else if (!user) {
      console.log('⚠️  No authenticated user found');
      console.log('This is expected for scripts - user auth required for uploads');
    } else {
      console.log('✅ User authenticated:', user.id);
      console.log('User email:', user.email);
      console.log('User role:', user.role);
    }
    
    // Check session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.log('❌ Session error:', sessionError.message);
    } else if (!session) {
      console.log('⚠️  No active session');
    } else {
      console.log('✅ Active session found');
      console.log('Session expires at:', new Date(session.expires_at * 1000).toISOString());
    }
  } catch (error) {
    console.log('❌ Auth check exception:', error.message);
    console.log('Full error:', error);
  }
  
  // 3. BUCKET CONFIGURATION
  console.log('\n=== 3. BUCKET CONFIGURATION ===');
  try {
    // Check bucket existence and configuration
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.log('❌ Cannot list buckets:', bucketsError.message);
      console.log('Full error:', JSON.stringify(bucketsError, null, 2));
    } else {
      console.log('✅ Available buckets:', buckets.map(b => b.name));
      
      const referralBucket = buckets.find(b => b.name === 'referral_attachments');
      if (referralBucket) {
        console.log('✅ referral_attachments bucket found:');
        console.log('   Public:', referralBucket.public);
        console.log('   Created:', referralBucket.created_at);
        console.log('   Updated:', referralBucket.updated_at);
        console.log('   File size limit:', referralBucket.file_size_limit);
        console.log('   Allowed MIME types:', referralBucket.allowed_mime_types);
      } else {
        console.log('❌ referral_attachments bucket not found in bucket list');
      }
    }
  } catch (error) {
    console.log('❌ Bucket check exception:', error.message);
    console.log('Full error:', error);
  }
  
  // 4. FILE LISTING TEST
  console.log('\n=== 4. FILE LISTING TEST ===');
  try {
    const { data: files, error: listError } = await supabase.storage
      .from('referral_attachments')
      .list('', { limit: 5 });
    
    if (listError) {
      console.log('❌ Cannot list files in bucket:', listError.message);
      console.log('Full error:', JSON.stringify(listError, null, 2));
    } else {
      console.log(`✅ Found ${files?.length || 0} files in bucket`);
      if (files && files.length > 0) {
        files.forEach((file, index) => {
          console.log(`   ${index + 1}. ${file.name}`);
          console.log(`      Size: ${file.metadata?.size || 'unknown'} bytes`);
          console.log(`      Type: ${file.metadata?.mimetype || 'unknown'}`);
          console.log(`      Modified: ${file.updated_at || 'unknown'}`);
        });
      }
    }
  } catch (error) {
    console.log('❌ File listing exception:', error.message);
    console.log('Full error:', error);
  }
  
  // 5. URL GENERATION & PATH DISCOVERY TEST
  console.log('\n=== 5. URL GENERATION & PATH DISCOVERY TEST ===');
  try {
    // First, list all files in bucket (including subdirectories)
    const { data: rootFiles } = await supabase.storage
      .from('referral_attachments')
      .list('', { limit: 100, sortBy: { column: 'name', order: 'desc' } });
    
    if (rootFiles && rootFiles.length > 0) {
      console.log(`Found ${rootFiles.length} items in root directory`);
      
      // Look for user directories (UUID format)
      const userDirectories = rootFiles.filter(item => 
        item.name && 
        !item.name.includes('.') && 
        item.name.length >= 32
      );
      
      console.log(`Found ${userDirectories.length} potential user directories:`, 
        userDirectories.map(d => d.name).slice(0, 3));
      
      // Test file discovery in user directories
      for (const userDir of userDirectories.slice(0, 2)) { // Test first 2 directories
        console.log(`\nTesting user directory: ${userDir.name}`);
        
        const { data: userFiles, error: userFilesError } = await supabase.storage
          .from('referral_attachments')
          .list(userDir.name, { limit: 10 });
        
        if (userFilesError) {
          console.log(`⚠️  Error listing files in ${userDir.name}:`, userFilesError.message);
          continue;
        }
        
        if (userFiles && userFiles.length > 0) {
          console.log(`   Found ${userFiles.length} files in this directory`);
          
          // Test URL generation for the first file
          const testFile = userFiles[0];
          const fullPath = `${userDir.name}/${testFile.name}`;
          const fileNameOnly = testFile.name;
          
          console.log(`   Testing file: ${testFile.name}`);
          console.log(`   Full path: ${fullPath}`);
          
          // Test URL generation with full path
          const { data: fullPathUrl } = supabase.storage
            .from('referral_attachments')
            .getPublicUrl(fullPath);
          
          console.log(`   ✅ Full path URL: ${fullPathUrl.publicUrl}`);
          
          // Test URL generation with filename only (should fail)
          const { data: fileNameOnlyUrl } = supabase.storage
            .from('referral_attachments')
            .getPublicUrl(fileNameOnly);
          
          console.log(`   ⚠️  Filename-only URL: ${fileNameOnlyUrl.publicUrl}`);
          
          // Test URL accessibility for full path
          try {
            const response = await fetch(fullPathUrl.publicUrl, { 
              method: 'HEAD',
              headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; diagnostic-script/1.0)'
              }
            });
            console.log(`   ✅ Full path URL accessible - Status: ${response.status} ${response.statusText}`);
          } catch (fetchError) {
            console.log(`   ❌ Full path URL failed: ${fetchError.message}`);
          }
          
          // Test URL accessibility for filename only (should fail)
          try {
            const response = await fetch(fileNameOnlyUrl.publicUrl, { 
              method: 'HEAD',
              headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; diagnostic-script/1.0)'
              }
            });
            console.log(`   ⚠️  Filename-only URL response - Status: ${response.status} ${response.statusText}`);
          } catch (fetchError) {
            console.log(`   ❌ Filename-only URL failed (expected): ${fetchError.message}`);
          }
          
          // Test our new path discovery logic simulation
          console.log(`   🔍 Testing path discovery logic:`);
          let discoveredPath = fileNameOnly;
          
          // Simulate the logic from useReferrals.ts
          if (!fileNameOnly.includes('/')) {
            console.log(`   - File name doesn't include path, searching...`);
            
            // Search for the file in user directories
            for (const searchDir of userDirectories) {
              const { data: searchFiles } = await supabase.storage
                .from('referral_attachments')
                .list(searchDir.name, { limit: 50 });
              
              if (searchFiles) {
                const foundFile = searchFiles.find(f => 
                  f.name === fileNameOnly || f.name?.endsWith(fileNameOnly)
                );
                if (foundFile) {
                  discoveredPath = `${searchDir.name}/${foundFile.name}`;
                  console.log(`   - ✅ Found file at: ${discoveredPath}`);
                  break;
                }
              }
            }
          }
          
          if (discoveredPath !== fileNameOnly) {
            const { data: discoveredUrl } = supabase.storage
              .from('referral_attachments')
              .getPublicUrl(discoveredPath);
            
            console.log(`   ✅ Discovered path URL: ${discoveredUrl.publicUrl}`);
            
            // Test accessibility of discovered URL
            try {
              const response = await fetch(discoveredUrl.publicUrl, { 
                method: 'HEAD',
                headers: {
                  'User-Agent': 'Mozilla/5.0 (compatible; diagnostic-script/1.0)'
                }
              });
              console.log(`   ✅ Discovered URL accessible - Status: ${response.status} ${response.statusText}`);
            } catch (fetchError) {
              console.log(`   ❌ Discovered URL failed: ${fetchError.message}`);
            }
          } else {
            console.log(`   ⚠️  Path discovery didn't find the file`);
          }
          
          break; // Test only first file for now
        } else {
          console.log(`   No files found in ${userDir.name}`);
        }
      }
    } else {
      console.log('⚠️  No files or directories found in bucket');
    }
  } catch (error) {
    console.log('❌ URL generation & path discovery exception:', error.message);
    console.log('Full error:', error);
  }
  
  // 6. DETAILED UPLOAD TEST
  console.log('\n=== 6. DETAILED UPLOAD TEST ===');
  console.log('Creating a small test file...');
  
  // Create test file content
  const testContent = `Upload test file created at ${new Date().toISOString()}
File size: Small text file for testing
Purpose: Diagnose upload issues
Note: This file will be deleted after testing`;
  
  const testFileName = `diagnostic-test-${Date.now()}.txt`;
  
  console.log('Test file details:');
  console.log('   Name:', testFileName);
  console.log('   Size:', testContent.length, 'bytes');
  console.log('   Type: text/plain');
  
  try {
    console.log('Attempting upload...');
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('referral_attachments')
      .upload(testFileName, testContent, {
        contentType: 'text/plain',
        cacheControl: '3600',
        upsert: false
      });
    
    if (uploadError) {
      console.log('❌ UPLOAD FAILED');
      console.log('Error message:', uploadError.message);
      console.log('Error code:', uploadError.statusCode);
      console.log('Full error object:', JSON.stringify(uploadError, null, 2));
      
      // Analyze specific error types
      if (uploadError.message.includes('policy')) {
        console.log('\n🔍 POLICY ANALYSIS:');
        console.log('This appears to be a Row Level Security (RLS) policy issue');
        console.log('Common causes:');
        console.log('   - No authenticated user (scripts cannot authenticate)');
        console.log('   - Missing INSERT policy for storage.objects');
        console.log('   - Policy conditions not met');
      } else if (uploadError.message.includes('bucket')) {
        console.log('\n🔍 BUCKET ANALYSIS:');
        console.log('This appears to be a bucket configuration issue');
        console.log('Common causes:');
        console.log('   - Bucket does not exist');
        console.log('   - Bucket not properly configured');
        console.log('   - Client lacks permission to access bucket');
      } else if (uploadError.statusCode === 400) {
        console.log('\n🔍 400 ERROR ANALYSIS:');
        console.log('HTTP 400 indicates a client request issue');
        console.log('Common causes:');
        console.log('   - Invalid file path format');
        console.log('   - File validation failed');
        console.log('   - Authentication header issues');
        console.log('   - Bucket policy restrictions');
      }
    } else {
      console.log('✅ UPLOAD SUCCESSFUL!');
      console.log('Upload result:', uploadData);
      console.log('File path:', uploadData.path);
      console.log('File ID:', uploadData.id);
      
      // Generate URL for uploaded file
      const { data: urlData } = supabase.storage
        .from('referral_attachments')
        .getPublicUrl(testFileName);
      
      console.log('Generated URL:', urlData.publicUrl);
      
      // Clean up
      console.log('\nCleaning up test file...');
      const { error: deleteError } = await supabase.storage
        .from('referral_attachments')
        .remove([testFileName]);
      
      if (deleteError) {
        console.log('⚠️  Failed to clean up:', deleteError.message);
      } else {
        console.log('✅ Test file cleaned up successfully');
      }
    }
  } catch (uploadException) {
    console.log('❌ UPLOAD EXCEPTION:', uploadException.message);
    console.log('Exception type:', uploadException.constructor.name);
    console.log('Full exception:', uploadException);
  }
  
  // 7. DATABASE CONNECTION TEST
  console.log('\n=== 7. DATABASE CONNECTION TEST ===');
  try {
    const { data: dbTest, error: dbError } = await supabase
      .from('referrals')
      .select('count')
      .limit(1);
    
    if (dbError) {
      console.log('❌ Database connection failed:', dbError.message);
      console.log('Full DB error:', JSON.stringify(dbError, null, 2));
    } else {
      console.log('✅ Database connection successful');
    }
  } catch (dbException) {
    console.log('❌ Database exception:', dbException.message);
  }
  
  console.log('\n=== DIAGNOSTIC COMPLETE ===');
  console.log('📋 Summary of findings above should help identify the root cause');
  console.log('Key areas to review:');
  console.log('   1. Authentication status (user must be logged in for uploads)');
  console.log('   2. Bucket configuration and policies');
  console.log('   3. Specific error messages and codes');
  console.log('   4. File path format and validation');
}

// Run comprehensive test
comprehensiveUploadTest().catch(console.error);
