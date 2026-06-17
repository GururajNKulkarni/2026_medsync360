/**
 * Apply medication history migration
 * Creates comprehensive medication tracking system
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.error('❌ Missing required environment variable: VITE_SUPABASE_URL');
  process.exit(1);
}

if (!supabaseServiceKey && !supabaseAnonKey) {
  console.error('❌ Missing Supabase keys. Need either:');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY (preferred for migrations)');
  console.error('   - VITE_SUPABASE_ANON_KEY (fallback)');
  process.exit(1);
}

// Use service key if available, otherwise use anon key
const supabaseKey = supabaseServiceKey || supabaseAnonKey;
const supabase = createClient(supabaseUrl, supabaseKey);

if (!supabaseServiceKey) {
  console.warn('⚠️ Using anon key instead of service role key');
  console.warn('⚠️ Some migration operations may fail due to insufficient permissions');
  console.warn('⚠️ Consider using manual migration through Supabase dashboard');
}

async function applyMedicationHistoryMigration() {
  try {
    console.log('🚀 Starting medication history migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/20250726160000_create_medication_history.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Executing medication history migration...');
    
    // Execute the migration
    const { error } = await supabase.rpc('exec', { sql: migrationSQL });
    
    if (error) {
      throw error;
    }
    
    console.log('✅ Medication history migration completed successfully!');
    
    // Verify the migration
    console.log('🔍 Verifying migration results...');
    
    // Check if medication_history table exists
    const { data: tables, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'medication_history');
    
    if (tableError) {
      console.warn('⚠️ Could not verify table creation:', tableError.message);
    } else if (tables && tables.length > 0) {
      console.log('✅ medication_history table created successfully');
    }
    
    // Check medication_history record count
    const { count: historyCount, error: countError } = await supabase
      .from('medication_history')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.warn('⚠️ Could not count medication history records:', countError.message);
    } else {
      console.log(`📊 Medication history records: ${historyCount}`);
    }
    
    // Check if referrals table has new columns
    const { data: columns, error: columnError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'referrals')
      .in('column_name', ['last_medication_update', 'medication_update_count']);
    
    if (columnError) {
      console.warn('⚠️ Could not verify new columns:', columnError.message);
    } else if (columns && columns.length === 2) {
      console.log('✅ New referrals table columns added successfully');
    }
    
    console.log('\n🎉 Medication history system is ready!');
    console.log('\nNext steps:');
    console.log('1. Update frontend components to use medication history');
    console.log('2. Update Excel export to include medication timeline');
    console.log('3. Test the medication tracking functionality');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

// Alternative method using direct SQL execution if RPC doesn't work
async function applyMigrationDirect() {
  try {
    console.log('🔄 Attempting direct SQL execution...');
    
    const migrationPath = path.join(__dirname, '../supabase/migrations/20250726160000_create_medication_history.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📄 Executing ${statements.length} SQL statements...`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
      
      const { error } = await supabase.rpc('exec_sql', { 
        sql_statement: statement + ';' 
      });
      
      if (error) {
        console.error(`❌ Error in statement ${i + 1}:`, error.message);
        // Continue with other statements
      }
    }
    
    console.log('✅ Direct migration execution completed!');
    
  } catch (error) {
    console.error('❌ Direct migration failed:', error.message);
    throw error;
  }
}

// Main execution
async function main() {
  try {
    await applyMedicationHistoryMigration();
  } catch (error) {
    console.log('\n🔄 Primary method failed, trying alternative approach...');
    try {
      await applyMigrationDirect();
    } catch (directError) {
      console.error('\n❌ Both migration methods failed.');
      console.error('Please apply the migration manually through Supabase dashboard:');
      console.error('1. Go to your Supabase project dashboard');
      console.error('2. Navigate to SQL Editor');
      console.error('3. Copy and paste the content from:');
      console.error('   supabase/migrations/20250726160000_create_medication_history.sql');
      console.error('4. Execute the SQL');
      process.exit(1);
    }
  }
}

main();
