require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env') });
const { createClient } = require('@supabase/supabase-js');

// --- Configuration ---
const REFERRAL_ID = '449c4a00-2d64-43e5-b265-944a7fe72e56';

// --- Supabase Client Setup ---
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Supabase URL or Service Role Key is not defined in .env file.');
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

console.log(`🚀 Running diagnostics for Referral ID: ${REFERRAL_ID}`);
console.log('====================================================\n');

// --- Direct Query Execution ---
async function runDiagnostics() {
  
  console.log('\n--- 1. Basic Referral Information ---');
  const { data: basicInfo, error: basicError } = await supabase
    .from('referrals')
    .select('id, title, status, created_at, transfer_parent_id, medication_given, initial_medication')
    .eq('id', REFERRAL_ID);
  if (basicError) console.error('❌ Error:', basicError.message);
  else console.table(basicInfo);

  console.log('\n--- 2. Medication History for this ID ---');
  const { data: medHistory, error: medHistoryError } = await supabase
    .from('medication_history')
    .select('*')
    .eq('referral_id', REFERRAL_ID);
  if(medHistoryError) console.error('❌ Error:', medHistoryError.message);
  else console.table(medHistory);

  console.log('\n--- 3. Function: get_complete_medication_trail ---');
  const { data: trail, error: trailError } = await supabase
    .rpc('get_complete_medication_trail', { p_referral_id: REFERRAL_ID });
  if (trailError) console.error('❌ Error:', trailError.message);
  else console.table(trail);

  console.log('\n--- 4. Function: get_referral_transfer_history ---');
    const { data: transferHistory, error: transferHistoryError } = await supabase
    .rpc('get_referral_transfer_history', { p_referral_id: REFERRAL_ID });
  if (transferHistoryError) console.error('❌ Error:', transferHistoryError.message);
  else console.table(transferHistory);

  console.log('\n====================================================');
  console.log('🏁 Diagnostics complete.');
}

runDiagnostics();
