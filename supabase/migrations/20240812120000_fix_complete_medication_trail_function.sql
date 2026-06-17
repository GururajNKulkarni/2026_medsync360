-- Drop the old function to ensure a clean slate
DROP FUNCTION IF EXISTS get_complete_medication_trail(UUID);

-- Create the new, more robust function
CREATE OR REPLACE FUNCTION get_complete_medication_trail(p_referral_id UUID)
RETURNS TABLE (
    step_number INTEGER,
    record_timestamp TIMESTAMPTZ,
    formatted_time TEXT,
    doctor_name TEXT,
    doctor_id UUID,
    action_type TEXT,
    department_context TEXT,
    medication_prescribed TEXT,
    medication_context TEXT,
    referral_id UUID,
    referral_title TEXT,
    is_original_referral BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE referral_chain AS (
        -- Anchor member: Start with the given referral and find its ultimate parent
        SELECT
            r.id,
            r.transfer_parent_id,
            1 AS level,
            ARRAY[r.id] AS path_ids
        FROM
            referrals r
        WHERE
            r.id = p_referral_id

        UNION ALL

        -- Recursive member: Traverse up the chain to the original referral
        SELECT
            r.id,
            r.transfer_parent_id,
            rc.level + 1 AS level,
            rc.path_ids || r.id AS path_ids
        FROM
            referrals r
        INNER JOIN
            referral_chain rc ON r.id = rc.transfer_parent_id
        WHERE r.id <> ALL(rc.path_ids) -- Prevents cycles
    ),
    full_chain AS (
        -- Now, traverse down from the original referral to get the complete history in order
        SELECT
            r.*
        FROM
            referrals r
        WHERE r.id IN (SELECT unnest(path_ids) FROM referral_chain)
    ),
    medication_events AS (
        -- Event 1: The absolute first creation of the original referral
        SELECT
            fc.id AS referral_id,
            fc.created_at AS event_timestamp,
            fc.from_user_id AS event_user_id,
            'Created Referral' AS event_type,
            fc.initial_medication AS medication_value,
            'Original prescription by ' || COALESCE(fu.full_name, 'Unknown Doctor') AS medication_context,
            fc.title AS referral_title,
            TRUE AS is_original_referral_in_chain, -- This is the original
            COALESCE(fu.department, 'Unknown Department') AS event_department
        FROM
            full_chain fc
        LEFT JOIN
            users fu ON fc.from_user_id = fu.id
        WHERE
            fc.transfer_parent_id IS NULL

        UNION ALL

        -- Event 2: All subsequent medication history entries
        SELECT
            mh.referral_id,
            mh.updated_at AS event_timestamp,
            mh.updated_by AS event_user_id,
            CASE
                WHEN mh.update_type = 'completion_update' THEN 'Completed Referral'
                WHEN mh.update_type = 'transfer_update' THEN 'Updated During Transfer'
                WHEN mh.update_type = 'initial' THEN 'Initial Medication Set'
                ELSE 'Manual Update'
            END AS event_type,
            mh.medication_text AS medication_value,
            CASE
                WHEN mh.update_type = 'completion_update' THEN 'Final medication update by ' || COALESCE(u.full_name, 'Unknown User')
                WHEN mh.update_type = 'transfer_update' THEN 'Updated medication during transfer to ' || COALESCE(r.to_department, 'Unknown Department')
                WHEN mh.update_type = 'initial' THEN 'Initial medication set by ' || COALESCE(u.full_name, 'Unknown User')
                ELSE 'Manual medication update by ' || COALESCE(u.full_name, 'Unknown User')
            END AS medication_context,
            r.title AS referral_title,
            (r.transfer_parent_id IS NULL) AS is_original_referral_in_chain,
            COALESCE(u.department, r.to_department, 'Unknown Department') AS event_department
        FROM
            medication_history mh
        JOIN
            referrals r ON mh.referral_id = r.id
        LEFT JOIN
            users u ON mh.updated_by = u.id
        WHERE
            mh.referral_id IN (SELECT id FROM full_chain)
        
        UNION ALL

        -- Event 3: Explicit "Received Transfer" events for children
        SELECT
            fc.id as referral_id,
            fc.transferred_at as event_timestamp,
            fc.to_user_id as event_user_id,
            'Received Transfer' as event_type,
            fc.initial_medication as medication_value,
            'Received referral transfer from ' || COALESCE(fc.transferred_from_department, 'Unknown Department') as medication_context,
            fc.title as referral_title,
            FALSE as is_original_referral_in_chain,
            fc.to_department as event_department
        FROM
            full_chain fc
        WHERE
            fc.transfer_parent_id IS NOT NULL AND fc.transferred_at IS NOT NULL
    )
    SELECT
        CAST(ROW_NUMBER() OVER (ORDER BY me.event_timestamp ASC, 
                          CASE 
                            WHEN me.event_type = 'Created Referral' THEN 1
                            WHEN me.event_type = 'Initial Medication Set' THEN 2
                            WHEN me.event_type = 'Updated During Transfer' THEN 3
                            WHEN me.event_type = 'Received Transfer' THEN 4
                            WHEN me.event_type = 'Completed Referral' THEN 5
                            ELSE 6
                          END) AS INTEGER) AS step_number,
        me.event_timestamp AS record_timestamp,
        TO_CHAR(me.event_timestamp, 'Mon DD, YYYY at HH24:MI') AS formatted_time,
        COALESCE(u.full_name, 'System') AS doctor_name,
        me.event_user_id AS doctor_id,
        me.event_type AS action_type,
        me.event_department AS department_context,
        me.medication_value AS medication_prescribed,
        me.medication_context,
        me.referral_id,
        me.referral_title,
        me.is_original_referral_in_chain
    FROM
        medication_events me
    LEFT JOIN
        users u ON me.event_user_id = u.id
    ORDER BY
        record_timestamp ASC, step_number ASC;
END;
$$ LANGUAGE plpgsql;

-- Verify the function was created successfully
SELECT 
    routine_name, 
    routine_type, 
    data_type 
FROM information_schema.routines 
WHERE routine_name = 'get_complete_medication_trail' 
AND routine_schema = 'public';

-- Final check with a test referral ID known to have a full chain
-- This helps in CI/CD or manual testing to confirm the function works as expected
SELECT * FROM get_complete_medication_trail('449c4a00-2d64-43e5-b265-944a7fe72e56');

