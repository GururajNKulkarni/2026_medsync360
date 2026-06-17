const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://amcyswqhnyeiwjoxdmib.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtY3lzd3FobnllaXdqb3hkbWliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTkwMDE3OTksImV4cCI6MjAzNDU3Nzc5OX0.sqOMlKrmpJBPMgNQj4yNlQ-fCrMJMLQY9xJLw3rGJj8';
const supabase = createClient(supabaseUrl, supabaseKey);

async function investigateReferralTransfer() {
  try {
    console.log('🔍 INVESTIGATING REFERRAL TRANSFER ISSUE');
    console.log('====================================');
    
    const referralId = 'bc2ffa91-ae96-4f13-aedd-1b5c9c1d5f61';
    
    // 1. Check if referral exists
    console.log('\n1. Checking if referral exists...');
    const { data: referral, error: refError } = await supabase
      .from('referrals')
      .select('*')
      .eq('id', referralId)
      .single();
    
    if (refError) {
      console.log('❌ Error fetching referral:', refError.message);
      
      // Try to find recent referrals
      console.log('\n🔍 Searching for recent referrals...');
      const { data: similarRefs } = await supabase
        .from('referrals')
        .select('id, patient_name, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (similarRefs) {
        console.log('Recent referrals found:');
        similarRefs.forEach(ref => {
          console.log(`- ${ref.id} | ${ref.patient_name} | ${ref.status}`);
        });
      }
      return;
    }
    
    if (referral) {
      console.log('✅ Referral found!');
      console.log('Patient:', referral.patient_name || referral.title);
      console.log('Status:', referral.status);
      console.log('Department:', referral.to_department);
      console.log('Created:', referral.created_at);
      console.log('Transfer Parent ID:', referral.transfer_parent_id);
    }
    
    // 2. Test transfer function with this referral
    console.log('\n2. Testing transfer function...');
    const { data: transferResult, error: transferError } = await supabase.rpc('transfer_referral', {
      p_original_referral_id: referralId,
      p_new_to_user_id: 'test-user-id',
      p_new_to_department: 'MD General Medicine',
      p_transfer_reason: 'Test transfer',
      p_transfer_notes: 'Testing transfer functionality',
      p_transferred_by_user_id: 'test-transferrer-id'
    });
    
    if (transferError) {
      console.log('❌ Transfer function error:', transferError.message);
      console.log('Error code:', transferError.code);
      console.log('Error details:', transferError.details);
    } else {
      console.log('✅ Transfer function executed, result:', transferResult);
    }
    
    // 3. Check transfer-related columns exist
    console.log('\n3. Checking database schema...');
    const { data: columns, error: schemaError } = await supabase.rpc('exec_sql', {
      sql: `SELECT column_name, data_type, is_nullable 
           FROM information_schema.columns 
           WHERE table_name = 'referrals' 
           AND column_name LIKE '%transfer%'
           ORDER BY column_name;`
    });
    
    if (schemaError) {
      console.log('❌ Schema check error:', schemaError.message);
    } else {
      console.log('✅ Transfer columns in referrals table:');
      if (columns && columns.length > 0) {
        columns.forEach(col => {
          console.log(`- ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
        });
      } else {
        console.log('❌ No transfer columns found! Migration may not be applied.');
      }
    }
    
    // 4. Check if transfer_referral function exists
    console.log('\n4. Checking if transfer function exists...');
    const { data: functions, error: funcError } = await supabase.rpc('exec_sql', {
      sql: `SELECT proname, pronargs 
           FROM pg_proc 
           WHERE proname = 'transfer_referral';`
    });
    
    if (funcError) {
      console.log('❌ Function check error:', funcError.message);
    } else {
      console.log('✅ Transfer functions found:');
      if (functions && functions.length > 0) {
        functions.forEach(func => {
          console.log(`- ${func.proname} (args: ${func.pronargs})`);
        });
      } else {
        console.log('❌ transfer_referral function NOT FOUND!');
      }
    }
    
    // 5. Check users table for valid doctors
    console.log('\n5. Checking for active doctors...');
    const { data: doctors, error: doctorError } = await supabase
      .from('users')
      .select('id, full_name, department, is_active')
      .eq('is_active', true)
      .not('department', 'is', null)
      .limit(3);
    
    if (doctorError) {
      console.log('❌ Error fetching doctors:', doctorError.message);
    } else {
      console.log('✅ Sample active doctors:');
      if (doctors && doctors.length > 0) {
        doctors.forEach(doc => {
          console.log(`- ${doc.id} | ${doc.full_name} | ${doc.department}`);
        });
      } else {
        console.log('❌ No active doctors found!');
      }
    }
    
  } catch (error) {
    console.error('💥 Investigation failed:', error);
  }
}

investigateReferralTransfer();
