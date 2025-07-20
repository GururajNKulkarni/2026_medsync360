import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

interface DashboardStats {
  activeReferrals: number;
  upcomingDuties: number;
}

// Query keys
export const dashboardKeys = {
  all: ['dashboard'] as const,
  stats: (userId: string) => [...dashboardKeys.all, 'stats', userId] as const,
};

// Fetch dashboard statistics from database
const fetchDashboardStats = async (userId: string): Promise<DashboardStats> => {
  try {
    // Fetch active referrals (sent or received by user)
    const { data: referrals, error: referralsError } = await supabase
      .from('referrals')
      .select('id')
      .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
      .in('status', ['Sent', 'Received', 'Acknowledged']);

    if (referralsError) {
      console.error('Error fetching referrals:', referralsError);
    }

    // Fetch upcoming duties for user
    const today = new Date().toISOString().split('T')[0];
    const { data: duties, error: dutiesError } = await supabase
      .from('duty_roster')
      .select('id')
      .eq('user_id', userId)
      .gte('shift_date', today)
      .eq('status', 'Scheduled');

    if (dutiesError) {
      console.error('Error fetching duties:', dutiesError);
    }

    return {
      activeReferrals: referrals?.length || 0,
      upcomingDuties: duties?.length || 0,
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return {
      activeReferrals: 0,
      upcomingDuties: 0,
    };
  }
};

// Custom hook for dashboard statistics
export const useDashboardStats = () => {
  const { profile } = useAuthStore();
  
  return useQuery({
    queryKey: dashboardKeys.stats(profile?.id || ''),
    queryFn: () => fetchDashboardStats(profile?.id || ''),
    enabled: !!profile?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
};