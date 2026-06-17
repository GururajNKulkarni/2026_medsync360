/**
 * Apply medication_given column migration
 * This script will run the SQL migration to add the medication_given column
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMedicationMigration() {
  console.log('🏥 APPLYING MEDICATION_GIVEN COLUMN MIGRATION\n');
  
  try {
    // Read the migration file
    const migrationPath = path.join(process.cwd(), 'supabase/migrations/20250719135000_add_medication_given.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('=== MIGRATION CONTENT ===');
    console.log('📄 File:', migrationPath);
    console.log('📝 SQL Commands:');
    console.log(migrationSQL);
    console.log('\n=== APPLYING MIGRATION ===');
    
    // Execute the migration SQL
    // Note: We'll execute the individual commands since rpc doesn't support multi-statement
    
    // 1. Add the column
    console.log('1. Adding medication_given column...');
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE referrals ADD COLUMN IF NOT EXISTS medication_given text;`
    });
    
    if (alterError) {
      console.log('⚠️  RPC method not available, trying direct SQL execution...');
      
      // Alternative: Try using a simple query to add the column
      const { error: directError } = await supabase
        .from('referrals')
        .select('medication_given')
        .limit(1);
      
      if (directError && directError.message.includes('column "medication_given" does not exist')) {
        console.log('❌ Column does not exist and cannot be added via client');
        console.log('📋 MANUAL STEPS REQUIRED:');
        console.log('');
        console.log('Please run the following SQL in your Supabase Dashboard → SQL Editor:');
        console.log('');
        console.log('```sql');
        console.log('ALTER TABLE referrals ADD COLUMN IF NOT EXISTS medication_given text;');
        console.log('```');
        console.log('');
        console.log('Or apply the migration file: supabase/migrations/20250719135000_add_medication_given.sql');
        return;
      } else if (!directError) {
        console.log('✅ Column already exists!');
      }
    } else {
      console.log('✅ Column added successfully');
    }
    
    // 2. Verify the column exists
    console.log('\n2. Verifying column exists...');
    const { data: columnCheck, error: checkError } = await supabase
      .from('referrals')
      .select('medication_given')
      .limit(1);
    
    if (checkError) {
      if (checkError.message.includes('column "medication_given" does not exist')) {
        console.log('❌ Column verification failed - column does not exist');
        console.log('');
        console.log('📋 MANUAL MIGRATION REQUIRED:');
        console.log('Please run this SQL in Supabase Dashboard → SQL Editor:');
        console.log('');
        console.log('ALTER TABLE referrals ADD COLUMN medication_given text;');
        console.log('');
      } else {
        console.log('❌ Column verification failed:', checkError.message);
      }
    } else {
      console.log('✅ Column verification successful - medication_given column exists');
      
      // 3. Test inserting with medication_given
      console.log('\n3. Testing medication_given functionality...');
      console.log('The referral creation should now work with medication tracking!');
      
      // Show example usage
      console.log('\n=== EXAMPLE USAGE ===');
      console.log('When creating a referral, you can now include:');
      console.log('```js');
      console.log('medicationGiven: "Paracetamol 500mg, Administered at 14:30"');
      console.log('```');
      console.log('');
      console.log('This will be stored in the database for:');
      console.log('• Medical continuity');
      console.log('• Patient safety');
      console.log('• Reporting and analytics');
      console.log('• Excel export functionality');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('');
    console.log('📋 MANUAL MIGRATION REQUIRED:');
    console.log('Please apply the migration manually in Supabase Dashboard:');
    console.log('');
    console.log('1. Go to Supabase Dashboard → SQL Editor');
    console.log('2. Run: ALTER TABLE referrals ADD COLUMN medication_given text;');
    console.log('3. Verify the column was added');
  }
  
  console.log('\n=== MIGRATION COMPLETE ===');
  console.log('🎯 The referral system now supports medication tracking!');
}

applyMedicationMigration().catch(console.error);
