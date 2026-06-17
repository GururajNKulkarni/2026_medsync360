-- Migration: Fix transfer_parent_id relationships for proper transfer chain tracing
-- Date: 2025-08-06

-- Step 1: Fix James Bond transfer chain
-- Original: 36ed741e-bdc7-4ea6-aac3-76f9a95b2ca6 (MD Critical Care -> DM Cardiology)
-- Transfer: 36796ea2-63a0-4a98-9822-e4b1bb596d44 (DM Cardiology -> MD Anaesthesiology)
UPDATE referrals 
SET transfer_parent_id = '36ed741e-bdc7-4ea6-aac3-76f9a95b2ca6'
WHERE id = '36796ea2-63a0-4a98-9822-e4b1bb596d44';

-- Step 2: Fix Momin transfer chain
-- Original: ee295df0-37cd-4d00-a792-66508ba50d2d (MD Critical Care -> DM Cardiology)
-- Transfer: 56ec1bad-1dff-4ff6-97b8-d94fa431b5df (DM Cardiology -> MD Anaesthesiology)
UPDATE referrals 
SET transfer_parent_id = 'ee295df0-37cd-4d00-a792-66508ba50d2d'
WHERE id = '56ec1bad-1dff-4ff6-97b8-d94fa431b5df';

-- Step 3: Fix Sandeep transfer chain
-- Original: 59712a2d-591a-4c73-89a5-7ac82cac7fc7 (MD Anaesthesiology -> MD Critical Care)
-- Transfer: eb20a3df-f65e-4270-aacb-5de2f6dbb908 (MD Critical Care -> DM Cardiology)
UPDATE referrals 
SET transfer_parent_id = '59712a2d-591a-4c73-89a5-7ac82cac7fc7'
WHERE id = 'eb20a3df-f65e-4270-aacb-5de2f6dbb908';

-- Step 4: Fix Mohan transfer chain
-- Original: bdb50294-3b76-4cfc-8764-c4e0d46f9beb (MD Critical Care -> MD Anaesthesiology)
-- Transfer 1: 05e951ad-e8fa-4b0c-b8c9-8db504a1d524 (MD Anaesthesiology -> DM Cardiology)
-- Transfer 2: d1eae3f3-f08c-4681-84ac-c2e56c5efaf7 (DM Cardiology -> MD Anaesthesiology)
UPDATE referrals 
SET transfer_parent_id = 'bdb50294-3b76-4cfc-8764-c4e0d46f9beb'
WHERE id = '05e951ad-e8fa-4b0c-b8c9-8db504a1d524';

UPDATE referrals 
SET transfer_parent_id = '05e951ad-e8fa-4b0c-b8c9-8db504a1d524'
WHERE id = 'd1eae3f3-f08c-4681-84ac-c2e56c5efaf7';

-- Step 5: Fix Santosh transfer chain
-- Original: 6bf632b3-fb00-443a-b12b-2102ec0ed9b9 (MD Biochemistry -> DM Cardiology)
-- Transfer: 3c3fb317-2290-4a40-a56c-268598961d9b (DM Cardiology -> MD Anaesthesiology)
UPDATE referrals 
SET transfer_parent_id = '6bf632b3-fb00-443a-b12b-2102ec0ed9b9'
WHERE id = '3c3fb317-2290-4a40-a56c-268598961d9b';

-- Step 6: Fix Shankar transfer chain
-- Original: 72399cee-1c4c-46ee-abb9-73899035dc9e (MD Critical Care -> DM Cardiology)
-- Transfer: 24b0d8c1-1957-4f1e-8d32-d961b759875d (DM Cardiology -> MD Anaesthesiology)
UPDATE referrals 
SET transfer_parent_id = '72399cee-1c4c-46ee-abb9-73899035dc9e'
WHERE id = '24b0d8c1-1957-4f1e-8d32-d961b759875d';

-- Step 7: Fix Vinod transfer chain
-- Original: df1c59ca-1985-4553-8b83-c0c8600dd174 (MD Critical Care -> DM Cardiology)
-- Transfer: 7b047f3f-6d31-4d54-8789-4edda101e7e7 (DM Cardiology -> MD Anaesthesiology)
UPDATE referrals 
SET transfer_parent_id = 'df1c59ca-1985-4553-8b83-c0c8600dd174'
WHERE id = '7b047f3f-6d31-4d54-8789-4edda101e7e7';

-- Step 8: Fix Fakir transfer chain (3-step chain)
-- Original: 5b54ec78-5d66-4941-acd4-b2bd6411b270 (MD Anaesthesiology -> DM Cardiology)
-- Transfer 1: b223e9ce-5b7c-4b9b-868f-7329b408a664 (DM Cardiology -> MD Anaesthesiology)
-- Transfer 2: c92b6192-51c6-4a0b-a5f8-c2f8c0e214ae (MD Anaesthesiology -> DM Cardiology)
UPDATE referrals 
SET transfer_parent_id = '5b54ec78-5d66-4941-acd4-b2bd6411b270'
WHERE id = 'b223e9ce-5b7c-4b9b-868f-7329b408a664';

UPDATE referrals 
SET transfer_parent_id = 'b223e9ce-5b7c-4b9b-868f-7329b408a664'
WHERE id = 'c92b6192-51c6-4a0b-a5f8-c2f8c0e214ae';

-- Step 9: Fix Kiran transfer chain
-- Original: a7dbb213-07e5-406c-9d80-9c6699f9fcc9 (MD Anaesthesiology -> DM Cardiology)
-- This appears to be a single transfer, no parent needed

-- Step 10: Verify the fixes by checking transfer chains
-- This will show us if the relationships are now properly established
SELECT 
    'James Bond' as patient,
    id,
    transfer_parent_id,
    transfer_reason,
    status,
    created_at
FROM referrals 
WHERE patient_name = 'James Bond' AND transferred_at IS NOT NULL
ORDER BY created_at;

SELECT 
    'Momin' as patient,
    id,
    transfer_parent_id,
    transfer_reason,
    status,
    created_at
FROM referrals 
WHERE patient_name = 'Momin' AND transferred_at IS NOT NULL
ORDER BY created_at;

SELECT 
    'Mohan' as patient,
    id,
    transfer_parent_id,
    transfer_reason,
    status,
    created_at
FROM referrals 
WHERE patient_name = 'Mohan' AND transferred_at IS NOT NULL
ORDER BY created_at; 