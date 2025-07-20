import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

interface ActivityItem {
  id: string;
  type: 'referral' | 'duty';
  title: string;
  description: string;
  timestamp: string;
  status: 'success' | 'warning' | 'info' | 'error';
  metadata?: {
    department?: string;
    doctor?: string;
    urgency?: string;
  };
}

// Query keys
export const activityKeys = {
  all: ['activities'] as const,
  recent: (userId: string) => [...activityKeys.all, 'recent', userId] as const,
};

// Fetch recent activities from database
const fetchRecentActivities = async (userId: string): Promise<ActivityItem[]> => {
  try {
    const activities: ActivityItem[] = [];

    // Fetch recent referrals
    const { data: referrals, error: referralsError } = await supabase
      .from('referrals')
      .select(`
        *,
        from_user:users!referrals_from_user_id_fkey(full_name, department),
        to_user:users!referrals_to_user_id_fkey(full_name, department)
      `)
      .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(5);

    if (!referralsError && referrals) {
      referrals.forEach(referral => {
        const isReceived = referral.to_user_id === userId;
        const otherUser = isReceived ? referral.from_user : referral.to_user;
        
        activities.push({
          id: `referral-${referral.id}`,
          type: 'referral',
          title: isReceived ? 'Referral received' : 'Referral sent',
          description: `${isReceived ? 'From' : 'To'} ${otherUser?.full_name || 'Unknown'} - ${referral.title}`,
          timestamp: referral.created_at,
          status: referral.status === 'Acknowledged' ? 'success' : 
                  referral.status === 'Cancelled' ? 'error' : 
                  referral.urgency === 'Emergency' ? 'error' : 'info',
          metadata: {
            department: otherUser?.department,
            doctor: otherUser?.full_name,
            urgency: referral.urgency
          }
        });
      });
    }

    // Fetch recent duties
    const { data: duties, error: dutiesError } = await supabase
      .from('duty_roster')
      .select(`
        *,
        user:users(full_name, department)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(3);

    if (!dutiesError && duties) {
      duties.forEach(duty => {
        const isUpcoming = new Date(duty.shift_date) > new Date();
        
        activities.push({
          id: `duty-${duty.id}`,
          type: 'duty',
          title: isUpcoming ? 'Upcoming duty' : 'Duty completed',
          description: `${duty.shift_type} shift on ${new Date(duty.shift_date).toLocaleDateString()}`,
          timestamp: duty.created_at,
          status: duty.status === 'Completed' ? 'success' : 
                  isUpcoming ? 'warning' : 'info',
          metadata: {
            department: duty.department
          }
        });
      });
    }

    // Sort all activities by timestamp
    return activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5); // Keep only the 5 most recent

  } catch (error) {
    console.error('Error fetching recent activities:', error);
    return [];
  }
};

// Custom hook for recent activities
export const useRecentActivities = () => {
  const { profile } = useAuthStore();
  
  return useQuery({
    queryKey: activityKeys.recent(profile?.id || ''),
    queryFn: () => fetchRecentActivities(profile?.id || ''),
    enabled: !!profile?.id,
    staleTime: 3 * 60 * 1000, // 3 minutes
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
  });
};