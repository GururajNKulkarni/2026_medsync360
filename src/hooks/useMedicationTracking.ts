import { supabase } from '../lib/supabase';

export interface MedicationSummary {
  initial_medication: string | null;
  final_medication: string | null;
  total_updates: number;
  was_updated: boolean;
}

export interface MedicationTimeline {
  update_order: number;
  medication_text: string;
  update_type: string;
  notes: string | null;
  updated_by_name: string;
  updated_at: string;
  previous_medication: string | null;
}

export const useMedicationTracking = () => {
  
  /**
   * Track a medication update
   */
  const trackMedicationUpdate = async (
    referralId: string,
    newMedication: string,
    updateType: 'initial' | 'update' | 'transfer_update' | 'completion_update' = 'update',
    notes?: string,
    updatedBy?: string
  ) => {
    try {
      const { data, error } = await supabase.rpc('track_medication_update', {
        p_referral_id: referralId,
        p_new_medication: newMedication,
        p_update_type: updateType,
        p_notes: notes,
        p_updated_by: updatedBy
      });

      if (error) {
        console.error('Error tracking medication update:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Failed to track medication update:', error);
      throw error;
    }
  };

  /**
   * Get medication summary for Excel reports
   */
  const getMedicationSummary = async (referralId: string): Promise<MedicationSummary> => {
    try {
      const { data, error } = await supabase.rpc('get_medication_summary', {
        p_referral_id: referralId
      });

      if (error) {
        console.error('Error getting medication summary:', error);
        throw error;
      }

      return data?.[0] || {
        initial_medication: null,
        final_medication: null,
        total_updates: 0,
        was_updated: false
      };
    } catch (error) {
      console.error('Failed to get medication summary:', error);
      throw error;
    }
  };

  /**
   * Get complete medication timeline
   */
  const getMedicationTimeline = async (referralId: string): Promise<MedicationTimeline[]> => {
    try {
      const { data, error } = await supabase.rpc('get_medication_timeline', {
        p_referral_id: referralId
      });

      if (error) {
        console.error('Error getting medication timeline:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Failed to get medication timeline:', error);
      throw error;
    }
  };

  /**
   * Update referral medication with proper tracking
   */
  const updateReferralMedication = async (
    referralId: string, 
    newMedication: string,
    updateType: 'completion_update' | 'transfer_update' | 'update' = 'update',
    notes?: string
  ) => {
    try {
      // First track the medication change
      await trackMedicationUpdate(referralId, newMedication, updateType, notes);
      
      // Then update the referral record
      const { error } = await supabase
        .from('referrals')
        .update({ 
          medication_given: newMedication,
          last_medication_update: new Date().toISOString()
        })
        .eq('id', referralId);

      if (error) {
        console.error('Error updating referral medication:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Failed to update referral medication:', error);
      throw error;
    }
  };

  return {
    trackMedicationUpdate,
    getMedicationSummary,
    getMedicationTimeline,
    updateReferralMedication
  };
};

export default useMedicationTracking;
