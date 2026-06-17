import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { CompleteMedicationTrail } from '../types/referral.types';

export const useCompleteMedicationTrail = (referralId: string | null) => {
  return useQuery({
    queryKey: ['complete-medication-trail', referralId],
    queryFn: async (): Promise<CompleteMedicationTrail[]> => {
      if (!referralId) {
        throw new Error('Referral ID is required');
      }

      console.log('🔍 Fetching complete medication trail for referral:', referralId);

      const { data, error } = await supabase.rpc('get_complete_medication_trail', {
        p_referral_id: referralId
      });

      if (error) {
        console.error('❌ Error fetching complete medication trail:', error);
        throw new Error(`Failed to fetch complete medication trail: ${error.message}`);
      }

      if (!data) {
        console.warn('⚠️ No medication trail found for referral:', referralId);
        return [];
      }

      console.log('✅ Complete medication trail fetched:', data);

      // Transform the data to match our TypeScript interface
      return data.map((item: any) => ({
        step_number: item.step_number,
        timestamp: item.timestamp,
        formatted_time: item.formatted_time,
        doctor_name: item.doctor_name,
        doctor_id: item.doctor_id,
        action_type: item.action_type as 'Created Referral' | 'Updated During Transfer' | 'Completed Referral',
        department_context: item.department_context,
        medication_prescribed: item.medication_prescribed,
        medication_context: item.medication_context,
        referral_id: item.referral_id,
        referral_title: item.referral_title,
        is_original_referral: item.is_original_referral
      }));
    },
    enabled: !!referralId,
    staleTime: 2 * 60 * 1000, // 2 minutes - reduced from always fresh
    retry: 2,
    refetchOnWindowFocus: false
  });
};