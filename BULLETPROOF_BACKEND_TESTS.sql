-- 🛡️ BULLETPROOF BACKEND TESTING SUITE
-- Run these tests to ensure your transfer system handles all edge cases

-- ===================================================================
-- TEST 1: Verify All Transfer Constraints Work
-- ===================================================================

-- Check foreign key constraints are working
SELECT 
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
  AND kcu.column_name LIKE '%transfer%';

-- ===================================================================
-- TEST 2: Function Parameter Validation Test
-- ===================================================================

-- Test function with valid parameters (should work)
SELECT 'Testing function with NULL parameters...' AS test_description;

-- This should fail gracefully
SELECT transfer_referral(
  'non-existent-id'::uuid,
  'non-existent-user'::uuid,
  'Test Department',
  'Test reason',
  'Test notes',
  'non-existent-transferrer'::uuid
);

-- ===================================================================
-- TEST 3: Check All Available Referral Statuses
-- ===================================================================

SELECT 'Available referral statuses:' AS info;
SELECT enumlabel AS status 
FROM pg_enum e 
JOIN pg_type t ON e.enumtypid = t.oid 
WHERE t.typname = 'referral_status'
ORDER BY enumlabel;

-- ===================================================================
-- TEST 4: Transfer Function Security Test
-- ===================================================================

-- Check function exists and has correct security
SELECT 
  proname AS function_name,
  provolatile AS volatility,
  prosecdef AS security_definer,
  pronargs AS num_arguments,
  proargnames AS argument_names
FROM pg_proc 
WHERE proname = 'transfer_referral';

-- ===================================================================
-- TEST 5: Index Performance Test
-- ===================================================================

-- Check that indexes exist for performance
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'referrals' 
  AND indexname LIKE '%transfer%';

-- ===================================================================
-- TEST 6: Data Integrity Test - Check for Orphaned Transfers
-- ===================================================================

-- Look for transfers that might have orphaned data
SELECT 
  COUNT(*) as total_referrals,
  COUNT(transfer_parent_id) as referrals_with_transfer_parent,
  COUNT(CASE WHEN status = 'Transferred' THEN 1 END) as transferred_status_count,
  COUNT(CASE WHEN transfer_parent_id IS NOT NULL AND status != 'Received' THEN 1 END) as potential_orphaned_transfers
FROM referrals;

-- ===================================================================
-- TEST 7: Recent Referrals Analysis
-- ===================================================================

-- Check the current state of referrals
SELECT 
  status,
  COUNT(*) as count,
  COUNT(transfer_parent_id) as with_transfer_parent,
  COUNT(transferred_from_user_id) as with_transferred_from_user
FROM referrals 
GROUP BY status
ORDER BY count DESC;

-- ===================================================================
-- TEST 8: Transfer Chain Validation
-- ===================================================================

-- Check for potential circular references or broken chains
WITH transfer_chains AS (
  SELECT 
    r1.id as original_id,
    r1.patient_name as original_patient,
    r1.status as original_status,
    r2.id as transferred_id,
    r2.status as transferred_status,
    r2.to_department as transferred_to_dept
  FROM referrals r1
  LEFT JOIN referrals r2 ON r1.id = r2.transfer_parent_id
  WHERE r1.status = 'Transferred' OR r2.transfer_parent_id IS NOT NULL
)
SELECT 
  COUNT(*) as transfer_relationships,
  COUNT(CASE WHEN transferred_id IS NULL AND original_status = 'Transferred' THEN 1 END) as orphaned_transferred,
  COUNT(CASE WHEN transferred_id IS NOT NULL AND transferred_status != 'Received' THEN 1 END) as invalid_transferred_status
FROM transfer_chains;

-- ===================================================================
-- TEST 9: User Department Validation
-- ===================================================================

-- Check if users table has proper department data for transfers
SELECT 
  'User department check:' AS info,
  COUNT(*) as total_users,
  COUNT(department) as users_with_department,
  COUNT(DISTINCT department) as unique_departments
FROM users;

-- Show available departments
SELECT DISTINCT department, COUNT(*) as user_count
FROM users 
WHERE department IS NOT NULL
GROUP BY department
ORDER BY user_count DESC;

-- ===================================================================
-- TEST 10: Sample Transfer Test (Safe - No Data Modification)
-- ===================================================================

-- Check what would happen with a sample transfer (analysis only)
SELECT 
  'Sample referral for transfer testing:' AS info,
  id,
  patient_name,
  status,
  to_department,
  from_user_id,
  to_user_id,
  transfer_parent_id
FROM referrals 
WHERE status IN ('Received', 'In Progress')
  AND transfer_parent_id IS NULL
ORDER BY created_at DESC
LIMIT 3;

-- ===================================================================
-- FINAL SUMMARY
-- ===================================================================

SELECT 'BACKEND BULLETPROOF TEST SUMMARY' AS final_summary;
SELECT 
  'Transfer system is ready if:' AS criteria,
  '1. Foreign keys exist ✓' AS check1,
  '2. Function exists with security ✓' AS check2,
  '3. Indexes exist for performance ✓' AS check3,
  '4. No orphaned transfers ✓' AS check4,
  '5. Valid user departments ✓' AS check5;
