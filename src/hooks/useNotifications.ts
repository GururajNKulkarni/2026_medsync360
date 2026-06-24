import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

export interface DutyNotification {
  id: string;
  recipient_id: string;
  actor_id: string | null;
  duty_id: string | null;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const notificationKeys = {
  list: (userId?: string) => ['duty-notifications', userId] as const,
};

// Pending-approval notifications (new doctor registrations, superuser
// requests) can pile up if approvals are left unreviewed. Cap how many of
// these ever show in the bell — older ones stay in the DB, just not shown —
// so the dropdown doesn't fill up with dozens of approval entries.
const APPROVAL_NOTIFICATION_TYPES = ['doctor_approval_pending', 'superuser_request_pending'];
const APPROVAL_NOTIFICATION_DISPLAY_LIMIT = 5;

/**
 * Fetches the current user's duty notifications. Polls periodically so a
 * doctor sees a swap notification without a manual refresh. Fails soft if the
 * `duty_notifications` table has not been migrated yet.
 */
export const useNotifications = () => {
  const { profile } = useAuthStore();

  return useQuery({
    queryKey: notificationKeys.list(profile?.id),
    queryFn: async (): Promise<DutyNotification[]> => {
      if (!profile?.id) return [];

      const [othersResult, approvalsResult] = await Promise.all([
        supabase
          .from('duty_notifications')
          .select('*')
          .eq('recipient_id', profile.id)
          .not('type', 'in', `(${APPROVAL_NOTIFICATION_TYPES.join(',')})`)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('duty_notifications')
          .select('*')
          .eq('recipient_id', profile.id)
          .in('type', APPROVAL_NOTIFICATION_TYPES)
          .order('created_at', { ascending: false })
          .limit(APPROVAL_NOTIFICATION_DISPLAY_LIMIT),
      ]);

      if (othersResult.error || approvalsResult.error) {
        // Table may not exist in every environment — don't break the app shell.
        console.warn('Failed to load duty notifications:', othersResult.error?.message || approvalsResult.error?.message);
        return [];
      }

      const combined = [...(othersResult.data || []), ...(approvalsResult.data || [])] as DutyNotification[];
      combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return combined;
    },
    enabled: !!profile?.id,
    refetchInterval: 20000,
    staleTime: 10000,
  });
};

/**
 * Marks the given notifications as read.
 */
export const useMarkNotificationsRead = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuthStore();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (!ids.length) return;
      const { error } = await supabase
        .from('duty_notifications')
        .update({ is_read: true })
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.list(profile?.id) });
    },
  });
};
