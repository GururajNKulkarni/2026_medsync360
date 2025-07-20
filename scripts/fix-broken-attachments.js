/**
 * Script to fix broken attachment references in existing referrals
 * 
 * This script identifies referrals that have attachment filenames in the database
 * but no corresponding files in Supabase storage, and cleans up the broken references.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - VITE_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_ANON_KEY)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkFileExists(fileName) {
  try {
    const { data, error } = await supabase.storage
      .from('referral_attachments')
      .list('', {
        search: fileName
      });
    
    if (error) {
      console.log(`   ❌ Error checking file ${fileName}:`, error.message);
      return false;
    }
    
    return data && data.some(file => file.name === fileName);
  } catch (error) {
    console.log(`   ❌ Exception checking file ${fileName}:`, error.message);
    return false;
  }
}

async function fixBrokenAttachments() {
  console.log('🔍 Scanning for referrals with broken attachments...\n');
  
  // Get all referrals that have attachments
  const { data: referrals, error: referralsError } = await supabase
    .from('referrals')
    .select('id, patient_name, attachments')
    .not('attachments', 'is', null)
    .neq('attachments', '{}');
  
  if (referralsError) {
    console.error('❌ Error fetching referrals:', referralsError);
    return;
  }
  
  console.log(`📊 Found ${referrals?.length || 0} referrals with attachments\n`);
  
  if (!referrals || referrals.length === 0) {
    console.log('✅ No referrals with attachments found');
    return;
  }
  
  let fixedCount = 0;
  let totalBrokenFiles = 0;
  
  for (const referral of referrals) {
    console.log(`🔍 Checking referral: ${referral.patient_name} (ID: ${referral.id})`);
    
    if (!referral.attachments || !Array.isArray(referral.attachments)) {
      console.log('   ⚠️  Invalid attachments format, skipping');
      continue;
    }
    
    const validAttachments = [];
    const brokenAttachments = [];
    
    for (const fileName of referral.attachments) {
      if (!fileName || typeof fileName !== 'string') {
        console.log(`   ⚠️  Invalid filename format: ${fileName}`);
        brokenAttachments.push(fileName);
        continue;
      }
      
      console.log(`   🔍 Checking file: ${fileName}`);
      const exists = await checkFileExists(fileName);
      
      if (exists) {
        console.log(`   ✅ File exists: ${fileName}`);
        validAttachments.push(fileName);
      } else {
        console.log(`   ❌ File missing: ${fileName}`);
        brokenAttachments.push(fileName);
        totalBrokenFiles++;
      }
    }
    
    // Update referral if we found broken attachments
    if (brokenAttachments.length > 0) {
      console.log(`   🔧 Fixing referral: removing ${brokenAttachments.length} broken attachment(s)`);
      
      const { error: updateError } = await supabase
        .from('referrals')
        .update({ attachments: validAttachments })
        .eq('id', referral.id);
      
      if (updateError) {
        console.log(`   ❌ Error updating referral:`, updateError.message);
      } else {
        console.log(`   ✅ Updated referral: ${validAttachments.length} valid attachment(s) remaining`);
        fixedCount++;
      }
    } else {
      console.log(`   ✅ All attachments valid for this referral`);
    }
    
    console.log(''); // Empty line for readability
  }
  
  // Also clean up orphaned attachment records
  console.log('🧹 Cleaning up orphaned attachment records...\n');
  
  const { data: attachmentRecords, error: attachmentError } = await supabase
    .from('referral_attachments')
    .select('*');
  
  if (attachmentError) {
    console.error('❌ Error fetching attachment records:', attachmentError);
  } else if (attachmentRecords) {
    let orphanedCount = 0;
    
    for (const record of attachmentRecords) {
      console.log(`🔍 Checking attachment record: ${record.file_name}`);
      
      const exists = await checkFileExists(record.file_name);
      
      if (!exists) {
        console.log(`   ❌ Orphaned record found: ${record.file_name}`);
        
        const { error: deleteError } = await supabase
          .from('referral_attachments')
          .delete()
          .eq('id', record.id);
        
        if (deleteError) {
          console.log(`   ❌ Error deleting orphaned record:`, deleteError.message);
        } else {
          console.log(`   ✅ Deleted orphaned record`);
          orphanedCount++;
        }
      } else {
        console.log(`   ✅ Attachment record valid`);
      }
    }
    
    console.log(`\n🧹 Cleaned up ${orphanedCount} orphaned attachment records`);
  }
  
  console.log('\n📊 Summary:');
  console.log(`   • ${fixedCount} referrals updated`);
  console.log(`   • ${totalBrokenFiles} broken file references removed`);
  console.log(`   • Database cleaned and optimized`);
  console.log('\n✅ Broken attachment cleanup completed!');
}

async function main() {
  console.log('🚀 Starting broken attachment cleanup...\n');
  
  try {
    await fixBrokenAttachments();
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the script
main();
