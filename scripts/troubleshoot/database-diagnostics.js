/**
 * Database diagnostics script to check what's actually in the database
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  console.error('URL:', supabaseUrl ? 'Set' : 'Missing');
  console.error('Key:', supabaseServiceKey ? 'Set' : 'Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function diagnostics() {
  console.log('🔍 Running database diagnostics...\n');
  
  // Check basic connection
  console.log('1. Testing database connection...');
  try {
    const { data, error } = await supabase.from('referrals').select('count').limit(1);
    if (error) {
      console.log('❌ Connection error:', error.message);
      return;
    } else {
      console.log('✅ Database connection successful');
    }
  } catch (error) {
    console.log('❌ Connection exception:', error.message);
    return;
  }
  
  // Check referrals table
  console.log('\n2. Checking referrals table...');
  const { data: referrals, error: referralsError } = await supabase
    .from('referrals')
    .select('*')
    .limit(10);
  
  if (referralsError) {
    console.log('❌ Error fetching referrals:', referralsError.message);
  } else {
    console.log(`📊 Found ${referrals?.length || 0} referrals in total`);
    
    if (referrals && referrals.length > 0) {
      console.log('\n📋 Sample referral data:');
      const sample = referrals[0];
      console.log('   Fields:', Object.keys(sample));
      console.log('   Sample ID:', sample.id);
      console.log('   Patient Name:', sample.patient_name);
      console.log('   Attachments:', sample.attachments);
      
      // Check all referrals for attachments
      let withAttachments = 0;
      referrals.forEach(ref => {
        if (ref.attachments && Array.isArray(ref.attachments) && ref.attachments.length > 0) {
          withAttachments++;
          console.log(`   📎 ${ref.patient_name}: ${ref.attachments.length} attachment(s) - ${JSON.stringify(ref.attachments)}`);
        }
      });
      
      console.log(`\n📊 ${withAttachments} referrals have attachments`);
    }
  }
  
  // Check referral_attachments table
  console.log('\n3. Checking referral_attachments table...');
  const { data: attachmentRecords, error: attachmentError } = await supabase
    .from('referral_attachments')
    .select('*')
    .limit(10);
  
  if (attachmentError) {
    console.log('❌ Error fetching attachment records:', attachmentError.message);
  } else {
    console.log(`📊 Found ${attachmentRecords?.length || 0} attachment records`);
    
    if (attachmentRecords && attachmentRecords.length > 0) {
      console.log('\n📋 Sample attachment records:');
      attachmentRecords.forEach(record => {
        console.log(`   📎 ${record.file_name} (Referral: ${record.referral_id})`);
        console.log(`      URL: ${record.file_url}`);
        console.log(`      Size: ${record.file_size}, Type: ${record.file_type}`);
      });
    }
  }
  
  // Check storage bucket
  console.log('\n4. Checking storage bucket...');
  try {
    const { data: bucketData, error: bucketError } = await supabase.storage.getBucket('referral_attachments');
    
    if (bucketError) {
      console.log('❌ Bucket error:', bucketError.message);
    } else {
      console.log('✅ Storage bucket exists:', bucketData ? 'Yes' : 'No');
      if (bucketData) {
        console.log('   Public:', bucketData.public);
        console.log('   File size limit:', bucketData.file_size_limit);
      }
    }
    
    // List files in bucket
    const { data: files, error: listError } = await supabase.storage
      .from('referral_attachments')
      .list('', { limit: 10 });
    
    if (listError) {
      console.log('❌ Error listing files:', listError.message);
    } else {
      console.log(`📊 Found ${files?.length || 0} files in storage`);
      if (files && files.length > 0) {
        console.log('\n📁 Files in storage:');
        files.forEach(file => {
          console.log(`   📄 ${file.name} (${file.metadata?.size || 'unknown size'})`);
        });
      }
    }
  } catch (error) {
    console.log('❌ Storage exception:', error.message);
  }
  
  console.log('\n✅ Diagnostics completed!');
}

// Run diagnostics
diagnostics();
