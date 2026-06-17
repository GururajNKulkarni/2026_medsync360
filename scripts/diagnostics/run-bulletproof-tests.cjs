const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hokostygwqtezidzdyzo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhva29zdHlnd3F0ZXppZHpkeXpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA0OTU1NjYsImV4cCI6MjA2NjA3MTU2Nn0.GrGWOkXVeLI7ynsOoRNxOMLrN5YvTn8P5jP7B9OPSx4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function runBulletproofTests() {
  console.log('🛡️ BULLETPROOF BACKEND TESTING SUITE');
  console.log('===================================');
  
  try {
    // TEST 1: Check Foreign Key Constraints
    console.log('\n📋 TEST 1: Foreign Key Constraints');
    console.log('----------------------------------');
    
    const { data: constraints, error: constraintError } = await supabase.rpc('exec_sql', {
      sql: `SELECT 
        tc.constraint_name, 
        tc.table_name, 
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name = 'referrals'
        AND kcu.column_name LIKE '%transfer%';`
    });
    
    if (constraintError) {
      console.log('❌ Constraint check failed:', constraintError.message);
    } else {
      console.log(`✅ Found ${constraints?.length || 0} transfer-related foreign key constraints:`);
      constraints?.forEach(c => {
        console.log(`  - ${c.column_name} → ${c.foreign_table_name}.${c.foreign_column_name}`);
      });
    }

    // TEST 2: Check All Transfer Columns
    console.log('\n📋 TEST 2: Transfer Columns');
    console.log('---------------------------');
    
    const { data: columns, error: columnError } = await supabase.rpc('exec_sql', {
      sql: `SELECT column_name, data_type, is_nullable 
           FROM information_schema.columns 
           WHERE table_name = 'referrals' 
           AND column_name LIKE '%transfer%'
           ORDER BY column_name;`
    });
    
    if (columnError) {
      console.log('❌ Column check failed:', columnError.message);
    } else {
      console.log(`✅ Found ${columns?.length || 0} transfer columns:`);
      columns?.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });
    }

    // TEST 3: Check Transfer Function Details
    console.log('\n📋 TEST 3: Transfer Function Analysis');
    console.log('------------------------------------');
    
    const { data: functions, error: funcError } = await supabase.rpc('exec_sql', {
      sql: `SELECT 
        proname AS function_name,
        provolatile AS volatility,
        prosecdef AS security_definer,
        pronargs AS num_arguments,
        proargnames AS argument_names
      FROM pg_proc 
      WHERE proname = 'transfer_referral';`
    });
    
    if (funcError) {
      console.log('❌ Function check failed:', funcError.message);
    } else if (functions?.length > 0) {
      console.log('✅ Transfer function found:');
      functions.forEach(func => {
        console.log(`  - Name: ${func.function_name}`);
        console.log(`  - Arguments: ${func.num_arguments}`);
        console.log(`  - Argument names: ${func.argument_names || 'Not available'}`);
        console.log(`  - Security definer: ${func.security_definer}`);
      });
    } else {
      console.log('❌ transfer_referral function NOT FOUND!');
    }

    // TEST 4: Check Referral Status Enum
    console.log('\n📋 TEST 4: Referral Status Enum');
    console.log('-------------------------------');
    
    const { data: statuses, error: statusError } = await supabase.rpc('exec_sql', {
      sql: `SELECT enumlabel AS status 
           FROM pg_enum e 
           JOIN pg_type t ON e.enumtypid = t.oid 
           WHERE t.typname = 'referral_status'
           ORDER BY enumlabel;`
    });
    
    if (statusError) {
      console.log('❌ Status enum check failed:', statusError.message);
    } else {
      console.log('✅ Available referral statuses:');
      statuses?.forEach(status => {
        console.log(`  - ${status.status}`);
      });
      const hasTransferred = statuses?.some(s => s.status === 'Transferred');
      console.log(`Transfer status available: ${hasTransferred ? '✅ YES' : '❌ NO'}`);
    }

    // TEST 5: Check Indexes
    console.log('\n📋 TEST 5: Transfer Indexes');
    console.log('---------------------------');
    
    const { data: indexes, error: indexError } = await supabase.rpc('exec_sql', {
      sql: `SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE tablename = 'referrals' 
        AND indexname LIKE '%transfer%';`
    });
    
    if (indexError) {
      console.log('❌ Index check failed:', indexError.message);
    } else {
      console.log(`✅ Found ${indexes?.length || 0} transfer-related indexes:`);
      indexes?.forEach(idx => {
        console.log(`  - ${idx.indexname}`);
      });
    }

    // TEST 6: Data Integrity Analysis
    console.log('\n📋 TEST 6: Data Integrity');
    console.log('-------------------------');
    
    const { data: integrity, error: integrityError } = await supabase.rpc('exec_sql', {
      sql: `SELECT 
        COUNT(*) as total_referrals,
        COUNT(transfer_parent_id) as referrals_with_transfer_parent,
        COUNT(CASE WHEN status = 'Transferred' THEN 1 END) as transferred_status_count,
        COUNT(CASE WHEN transfer_parent_id IS NOT NULL AND status != 'Received' THEN 1 END) as potential_orphaned_transfers
      FROM referrals;`
    });
    
    if (integrityError) {
      console.log('❌ Data integrity check failed:', integrityError.message);
    } else if (integrity?.length > 0) {
      const data = integrity[0];
      console.log('✅ Data integrity analysis:');
      console.log(`  - Total referrals: ${data.total_referrals}`);
      console.log(`  - With transfer parent: ${data.referrals_with_transfer_parent}`);
      console.log(`  - Transferred status: ${data.transferred_status_count}`);
      console.log(`  - Potential orphaned: ${data.potential_orphaned_transfers}`);
    }

    // TEST 7: Current Referral Distribution
    console.log('\n📋 TEST 7: Referral Status Distribution');
    console.log('---------------------------------------');
    
    const { data: distribution, error: distError } = await supabase.rpc('exec_sql', {
      sql: `SELECT 
        status,
        COUNT(*) as count,
        COUNT(transfer_parent_id) as with_transfer_parent,
        COUNT(transferred_from_user_id) as with_transferred_from_user
      FROM referrals 
      GROUP BY status
      ORDER BY count DESC;`
    });
    
    if (distError) {
      console.log('❌ Distribution check failed:', distError.message);
    } else {
      console.log('✅ Status distribution:');
      distribution?.forEach(stat => {
        console.log(`  - ${stat.status}: ${stat.count} total, ${stat.with_transfer_parent} with parent, ${stat.with_transferred_from_user} with from_user`);
      });
    }

    // TEST 8: Function Parameter Test (Safe Test)
    console.log('\n📋 TEST 8: Function Parameter Test');
    console.log('----------------------------------');
    
    try {
      const { data: funcTest, error: funcTestError } = await supabase.rpc('transfer_referral', {
        p_original_referral_id: '00000000-0000-0000-0000-000000000000',
        p_new_to_user_id: '00000000-0000-0000-0000-000000000001',
        p_new_to_department: 'Test Department',
        p_transfer_reason: 'Test',
        p_transfer_notes: 'Test',
        p_transferred_by_user_id: '00000000-0000-0000-0000-000000000002'
      });
      
      if (funcTestError) {
        console.log('❌ Function test failed (expected):', funcTestError.message);
        if (funcTestError.message.includes('not found')) {
          console.log('⚠️  This suggests the function exists but parameter names/order might be wrong');
        }
      } else {
        console.log('✅ Function test completed:', funcTest);
      }
    } catch (error) {
      console.log('❌ Function test error:', error.message);
    }

    // SUMMARY
    console.log('\n🎯 BULLETPROOF TEST SUMMARY');
    console.log('===========================');
    console.log('1. Foreign key constraints:', constraints?.length > 0 ? '✅ Present' : '⚠️ Missing');
    console.log('2. Transfer columns:', columns?.length === 6 ? '✅ All 6 present' : `⚠️ Only ${columns?.length || 0} found`);
    console.log('3. Transfer function:', functions?.length > 0 ? '✅ Exists' : '❌ Missing');
    console.log('4. Transferred status:', statuses?.some(s => s.status === 'Transferred') ? '✅ Available' : '❌ Missing');
    console.log('5. Performance indexes:', indexes?.length > 0 ? '✅ Present' : '⚠️ Missing');
    console.log('6. Data integrity: ✅ Checked');
    console.log('7. Status distribution: ✅ Analyzed');
    console.log('8. Function parameters: ⚠️ Needs verification');
    
  } catch (error) {
    console.error('💥 Bulletproof tests failed:', error.message);
  }
}

runBulletproofTests();
