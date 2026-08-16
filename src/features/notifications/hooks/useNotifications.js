import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { endpoints } from '@/api/endpoints';

const NOTIFICATIONS_QUERY_KEY = ['notifications'];

export function useNotifications() {
  return useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    queryFn: () => api.get(endpoints.notifications.list),
    refetchInterval: 60_000,
  });
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => api.patch(endpoints.notifications.markAsRead(id)),
    onSuccess: (updated) => {
      queryClient.setQueryData(NOTIFICATIONS_QUERY_KEY, (current = []) => current.map(
        (notification) => (notification.id === updated.id ? updated : notification),
      ));
    },
  });
}
