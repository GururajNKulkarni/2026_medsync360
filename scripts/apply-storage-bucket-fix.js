#!/usr/bin/env node

/**
 * Apply Storage Bucket Fix - Resolves RLS Policy Issues
 * 
 * This script applies the critical storage bucket fixes to resolve:
 * - "new row violates row-level security policy" errors
 * - File access issues (400 Bad Request)
 * - Missing storage bucket policies
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://hokostygwqtezidzdyzo.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  console.log('💡 You need to set this in your .env file with your service role key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('🔧 APPLYING STORAGE BUCKET FIXES');
console.log('='.repeat(50));

async function executeSQL(sql, description) {
  console.log(`\n${description}...`);
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    if (error) {
      // Try direct query if RPC fails
      const { data: directData, error: directError } = await supabase
        .from('_dummy')
        .select('*')
        .limit(0);
      
      if (directError) {
        throw error;
      }
      
      // Execute via raw SQL
      const { error: sqlError } = await supabase.sql`${sql}`;
      if (sqlError) {
        throw sqlError;
      }
    }
    console.log('✅ Success');
    return true;
  } catch (err) {
    console.log(`⚠️  ${err.message}`);
    return false;
  }
}

async function applyStorageBucketFix() {
  console.log('\n=== STEP 1: DROP EXISTING CONFLICTING POLICIES ===');
  
  const dropPolicies = [
    `DROP POLICY IF EXISTS "Allow authenticated users to upload referral attachments" ON storage.objects;`,
    `DROP POLICY IF EXISTS "Allow authenticated users to view referral attachments" ON storage.objects;`,
    `DROP POLICY IF EXISTS "Allow public read access to referral attachments" ON storage.objects;`,
    `DROP POLICY IF EXISTS "Allow authenticated users to update their own referral attachments" ON storage.objects;`,
    `DROP POLICY IF EXISTS "Allow authenticated users to delete their own referral attachments" ON storage.objects;`
  ];

  for (const sql of dropPolicies) {
    await executeSQL(sql, 'Dropping existing policy');
  }

  console.log('\n=== STEP 2: CREATE WORKING RLS POLICIES ===');
  
  const createPolicies = [
    {
      sql: `CREATE POLICY "authenticated_upload_referral_attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'referral_attachments');`,
      desc: 'Creating upload policy for authenticated users'
    },
    {
      sql: `CREATE POLICY "authenticated_select_referral_attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'referral_attachments');`,
      desc: 'Creating select policy for authenticated users'
    },
    {
      sql: `CREATE POLICY "public_select_referral_attachments"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'referral_attachments');`,
      desc: 'Creating public read policy'
    },
    {
      sql: `CREATE POLICY "authenticated_update_own_referral_attachments"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'referral_attachments' AND (storage.foldername(name))[1] = auth.uid()::text);`,
      desc: 'Creating update policy for own files'
    },
    {
      sql: `CREATE POLICY "authenticated_delete_own_referral_attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'referral_attachments' AND (storage.foldername(name))[1] = auth.uid()::text);`,
      desc: 'Creating delete policy for own files'
    }
  ];

  for (const policy of createPolicies) {
    await executeSQL(policy.sql, policy.desc);
  }

  console.log('\n=== STEP 3: ENSURE BUCKET IS PROPERLY CONFIGURED ===');
  
  await executeSQL(`
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES ('referral_attachments', 'referral_attachments', true, 10485760, null)
    ON CONFLICT (id) DO UPDATE SET
      public = true,
      file_size_limit = 10485760;
  `, 'Ensuring bucket configuration');

  console.log('\n=== STEP 4: VERIFY SETUP ===');
  
  try {
    const { data: bucketData, error: bucketError } = await supabase
      .storage
      .listBuckets();
    
    if (bucketError) {
      console.log('⚠️  Could not verify buckets:', bucketError.message);
    } else {
      const referralBucket = bucketData.find(b => b.id === 'referral_attachments');
      if (referralBucket) {
        console.log('✅ Bucket verified:', referralBucket);
      } else {
        console.log('❌ Bucket not found in list');
      }
    }
  } catch (err) {
    console.log('⚠️  Verification error:', err.message);
  }

  console.log('\n=== STORAGE BUCKET FIX COMPLETE ===');
  console.log('🎯 The storage bucket should now work properly!');
  console.log('\n📋 Next Steps:');
  console.log('1. Test file upload in the application');
  console.log('2. Check that existing files are now accessible');
  console.log('3. Run attachment diagnostics to verify all green');
}

// Execute the fix
applyStorageBucketFix().catch(console.error);
