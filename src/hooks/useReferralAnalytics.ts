import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

export interface ReferralAnalytics {
  totals: {
    total: number;
    closed: number;
    transferred: number;
    cancelled: number;
    in_progress: number;
  };
  avg_days_to_close: number | null;
  avg_hours_to_accept: number | null;
  transfer_rate: number;
  decline_rate: number;
  by_status: Array<{ status: string; count: number }>;
  by_urgency: Array<{ urgency: string; count: number }>;
  over_time: Array<{ month: string; count: number; closed: number }>;
  dept_flow: Array<{ department: string; sent: number; received: number }>;
  accept_by_department: Array<{ department: string; avg_hours: number }>;
  lifecycle_by_department: Array<{ department: string; avg_days: number }>;
  transfer_hotspots: Array<{ department: string; count: number }>;
  sankey: Array<{ source: string; target: string; count: number }>;
  decline_reasons: Array<{ reason: string; count: number }>;
  top_diagnoses: Array<{ category: string; count: number }>;
}

/**
 * Hospital-scoped referral analytics. Calls the SECURITY DEFINER
 * `get_referral_analytics` RPC, which aggregates across the whole hospital
 * (bypassing the per-department row RLS) while still scoping to the caller's
 * own hospital — Platform Owner sees the entire network.
 */
export const useReferralAnalytics = (fromDate?: string, toDate?: string) => {
  const { profile } = useAuthStore();

  return useQuery({
    queryKey: ['referral-analytics', profile?.id, fromDate, toDate],
    queryFn: async (): Promise<ReferralAnalytics> => {
      const { data, error } = await (supabase as any).rpc('get_referral_analytics', {
        ...(fromDate ? { p_from: fromDate } : {}),
        ...(toDate ? { p_to: toDate } : {}),
      });
      if (error) throw error;
      return data as ReferralAnalytics;
    },
    enabled: !!profile?.id,
    staleTime: 60_000,
  });
};
