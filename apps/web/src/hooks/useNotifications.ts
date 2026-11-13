import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface AppNotification {
  id: string;
  type: 'WORKLOG_AUTOCLOSE' | 'WORKLOG_APPROVAL_PENDING' | 'WORKLOG_APPROVAL_DECIDED';
  title: string;
  body: string;
  /** Caminho interno do app, escolhido pelo servidor. */
  link: string;
  readAt: string | null;
  createdAt: string;
}

const KEY = ['notifications'];
/** Sem push: o contador se atualiza sozinho a cada 60 segundos (e ao abrir o painel). */
export const NOTIFICATIONS_POLL_MS = 60_000;

export function useNotifications(enabled: boolean) {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => (await api.get<{ unread: number; items: AppNotification[] }>('/notifications')).data,
    enabled,
    refetchInterval: NOTIFICATIONS_POLL_MS,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.post(`/notifications/${id}/read`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.post('/notifications/read-all')).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
