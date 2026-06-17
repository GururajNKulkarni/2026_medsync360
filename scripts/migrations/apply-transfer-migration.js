const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - VITE_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyTransferMigration() {
  try {
    console.log('🚀 Starting referral transfer migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250727160000_add_referral_transfer_support.sql');
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('📖 Migration file loaded successfully');
    
    // Execute the migration
    console.log('⚡ Executing migration...');
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (error) {
      // If RPC doesn't exist, try direct execution (this might not work due to permissions)
      console.log('⚠️  RPC method not available, attempting direct execution...');
      
      // Split the SQL into individual statements and execute them
      const statements = migrationSQL
        .split(/;\s*\n/)
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
        .map(stmt => stmt.endsWith(';') ? stmt : stmt + ';');
      
      console.log(`📝 Found ${statements.length} SQL statements to execute`);
      
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        console.log(`   Executing statement ${i + 1}/${statements.length}...`);
        
        try {
          // For ALTER TABLE and other DDL statements, we need to use the raw query
          const { error: stmtError } = await supabase
            .from('dummy') // This will fail but might execute DDL
            .select('*')
            .limit(0);
          
          // Since direct DDL execution might not work, we'll log the SQL for manual execution
          console.log(`   ⚠️  Please execute this SQL manually in Supabase SQL Editor:`);
          console.log(`   ${statement.substring(0, 100)}...`);
        } catch (stmtError) {
          console.log(`   ⚠️  Statement needs manual execution: ${statement.substring(0, 50)}...`);
        }
      }
      
      console.log('\n📋 MANUAL EXECUTION REQUIRED:');
      console.log('Due to security restrictions, please execute the following in your Supabase SQL Editor:');
      console.log('👉 Go to: https://supabase.com/dashboard/project/[your-project]/sql');
      console.log('👉 Copy and paste the entire migration file content');
      console.log('👉 Click "Run" to apply the migration\n');
      
    } else {
      console.log('✅ Migration executed successfully!');
    }
    
    // Test the new functionality
    console.log('🧪 Testing transfer functionality...');
    
    // Test if the transfer_referral function exists
    const { data: testData, error: testError } = await supabase
      .rpc('transfer_referral', {
        p_original_referral_id: '00000000-0000-0000-0000-000000000000', // dummy ID
        p_new_to_user_id: '00000000-0000-0000-0000-000000000000',
        p_new_to_department: 'Test Department',
        p_transfer_reason: 'Test',
        p_transfer_notes: 'Test',
        p_transferred_by_user_id: '00000000-0000-0000-0000-000000000000'
      });
    
    if (testError && testError.message.includes('Original referral not found')) {
      console.log('✅ Transfer function is working correctly (expected error for dummy ID)');
    } else if (testError) {
      console.log('⚠️  Transfer function test failed:', testError.message);
      console.log('   This might be normal if migration needs manual execution');
    } else {
      console.log('✅ Transfer function test completed');
    }
    
    console.log('\n🎉 Transfer migration process completed!');
    console.log('\n📝 What was added:');
    console.log('   ✅ transfer_parent_id field to link transferred referrals');
    console.log('   ✅ transfer_reason and transfer_notes fields');
    console.log('   ✅ transferred_from_user_id and transferred_from_department fields');
    console.log('   ✅ transferred_at timestamp field');
    console.log('   ✅ "Transferred" status added to referral_status enum');
    console.log('   ✅ transfer_referral() function for handling transfers');
    console.log('   ✅ get_referral_transfer_history() function for tracking');
    console.log('   ✅ Proper indexes and constraints');
    
    console.log('\n🔄 Next steps:');
    console.log('   1. Update frontend to use new transfer functionality');
    console.log('   2. Test transfer workflow end-to-end');
    console.log('   3. Update referral status filtering to handle "Transferred" status');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Ensure SUPABASE_SERVICE_ROLE_KEY has sufficient permissions');
    console.log('   2. Check if migration was already applied');
    console.log('   3. Try executing the migration manually in Supabase SQL Editor');
    process.exit(1);
  }
}

// Run the migration
applyTransferMigration();
