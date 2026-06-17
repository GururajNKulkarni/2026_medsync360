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

      const { data, error } = await supabase
        .from('duty_notifications')
        .select('*')
        .eq('recipient_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        // Table may not exist in every environment — don't break the app shell.
        console.warn('Failed to load duty notifications:', error.message);
        return [];
      }

      return (data as DutyNotification[]) || [];
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
