CREATE OR REPLACE FUNCTION complete_referral(
  p_referral_id UUID,
  p_updated_medication TEXT,
  p_completed_by_user_id UUID
)
RETURNS VOID AS $$
BEGIN
  -- 1. Add the final medication entry to the history table
  INSERT INTO public.medication_history (referral_id, medication_text, update_type, updated_by)
  VALUES (p_referral_id, p_updated_medication, 'completion_update', p_completed_by_user_id);

  -- 2. Update the main referral record with the final details
  UPDATE public.referrals
  SET 
    status = 'Closed',
    medication_given = p_updated_medication, -- Update the primary field to the final medication
    end_time = NOW(),
    last_medication_update = NOW(),
    medication_update_count = (SELECT COUNT(*) FROM public.medication_history WHERE referral_id = p_referral_id)
  WHERE id = p_referral_id;

END;
$$ LANGUAGE plpgsql;
