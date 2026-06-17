/**
 * troubleshoot-referral.js
 * 
 * This script runs a comprehensive diagnostic check on a given referral ID.
 * It executes a series of SQL queries to fetch the referral's basic information,
 * its complete transfer chain, and its full medication history.
 * 
 * Usage:
 * node scripts/troubleshoot-referral.js <referral_id>
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

// Check for required environment variables
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase environment variables.');
  console.error('Please ensure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_ANON_KEY) are set in your .env file.');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// --- Query Definitions ---

const queries = [
  {
    title: "1. Basic Referral Information",
    query: `
      SELECT 
          id, title, patient_name, patient_age, patient_sex, status,
          created_at, from_user_id, to_user_id, to_department,
          transfer_parent_id, medication_given, initial_medication,
          start_time, end_time
      FROM referrals 
      WHERE id = '{referral_id}';
    `
  },
  {
    title: "2. Complete Transfer Chain",
    query: `
      WITH RECURSIVE referral_chain AS (
          SELECT 
              id, transfer_parent_id, 0 as level, ARRAY[id] as path
          FROM referrals 
          WHERE id = '{referral_id}'
          UNION ALL
          SELECT 
              r.id, r.transfer_parent_id, rc.level + 1, rc.path || r.id
          FROM referrals r
          INNER JOIN referral_chain rc ON r.id = rc.transfer_parent_id
      )
      SELECT 
          rc.level, rc.id, rc.transfer_parent_id,
          fu.full_name as from_doctor,
          tu.full_name as to_doctor
      FROM referral_chain rc
      LEFT JOIN referrals r ON r.id = rc.id
      LEFT JOIN users fu ON r.from_user_id = fu.id
      LEFT JOIN users tu ON r.to_user_id = tu.id
      ORDER BY level DESC;
    `
  },
  {
    title: "3. Medication History for this Referral ID",
    query: `
      SELECT 
          mh.id, mh.referral_id, mh.medication_text, mh.update_type,
          mh.updated_at, u.full_name as updated_by_doctor
      FROM medication_history mh
      LEFT JOIN users u ON mh.updated_by = u.id
      WHERE mh.referral_id = '{referral_id}'
      ORDER BY mh.updated_at ASC;
    `
  },
  {
    title: "4. Full Chain Medication History",
    query: `
      WITH RECURSIVE referral_chain AS (
          SELECT id, transfer_parent_id, ARRAY[id] as path
          FROM referrals 
          WHERE id = '{referral_id}'
          UNION ALL
          SELECT r.id, r.transfer_parent_id, rc.path || r.id
          FROM referrals r
          INNER JOIN referral_chain rc ON r.id = rc.transfer_parent_id
      ),
      all_chain_referrals AS (
          SELECT UNNEST(path) as referral_id FROM referral_chain
      )
      SELECT 
          r.id as referral_id, r.status, r.created_at as referral_created,
          mh.medication_text, mh.update_type, mh.updated_at as medication_updated,
          u.full_name as updated_by_doctor
      FROM all_chain_referrals acr
      JOIN referrals r ON acr.referral_id = r.id
      LEFT JOIN medication_history mh ON r.id = mh.referral_id
      LEFT JOIN users u ON mh.updated_by = u.id
      ORDER BY r.created_at ASC, mh.updated_at ASC;
    `
  },
  {
    title: "5. Get Complete Medication Trail (Function)",
    isRpc: true,
    functionName: 'get_complete_medication_trail',
    params: { p_referral_id: '{referral_id}' }
  },
  {
    title: "6. Get Transfer History (Function)",
    isRpc: true,
    functionName: 'get_referral_transfer_history',
    params: { p_referral_id: '{referral_id}' }
  }
];

/**
 * Executes the troubleshooting queries and displays the results.
 * @param {string} referralId - The UUID of the referral to troubleshoot.
 */
async function troubleshootReferral(referralId) {
  console.log('==================================================');
  console.log(`🩺 Troubleshooting Referral ID: ${referralId}`);
  console.log('==================================================\n');

  for (const item of queries) {
    console.log(`--- ${item.title} ---\n`);
    
    try {
      let data, error;

      if (item.isRpc) {
        // Handle RPC calls
        const params = JSON.parse(JSON.stringify(item.params).replace('{referral_id}', referralId));
        const result = await supabase.rpc(item.functionName, params);
        data = result.data;
        error = result.error;
      } else {
        // Handle direct SQL queries
        const { data, error } = await supabase.rpc('exec', { sql: item.query.replace(/{referral_id}/g, referralId) });
      }

      if (error) {
        console.error('❌ Query Failed:', error.message);
        if(error.hint) console.error(`   Hint: ${error.hint}`);
      } else if (data && data.length > 0) {
        console.table(data);
      } else {
        console.log('No results found for this query.');
      }
    } catch (err) {
      console.error('❌ An unexpected error occurred:', err.message);
    }
    
    console.log('\n');
  }
  
  console.log('✅ Troubleshooting complete.');
}

// --- Main Execution ---
function main() {
    const referralId = process.argv[2];
  
    if (!referralId) {
      console.error('❌ Error: Please provide a referral ID as a command-line argument.');
      console.error('Usage: node scripts/troubleshoot-referral.js <referral_id>');
      return;
    }
  
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(referralId)) {
      console.error('❌ Error: The provided referral ID does not appear to be a valid UUID.');
      return;
    }
    
    troubleshootReferral(referralId);
}
  
main();
