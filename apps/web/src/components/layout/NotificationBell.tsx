import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from '../../hooks/useNotifications';
import { useOpenInTab } from '../../contexts/TabsContext';
import { EzNotificationBell } from '../ds/EzNotificationBell';

const tabTitle = (link: string) => (link.startsWith('/releases') ? 'Liberações' : 'Ticket');

/** DMTE-462 T6: sino do cabeçalho. Atrás da flag sino-notificacoes: desligada, não aparece nem consulta a API. */
export function NotificationBell() {
  const enabled = useFeatureFlag('sino-notificacoes');
  const { data, isLoading, isError, refetch } = useNotifications(enabled);
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const openInTab = useOpenInTab();

  if (!enabled) return null;

  const items = data?.items ?? [];
  return (
    <EzNotificationBell
      items={items}
      unreadCount={data?.unread ?? 0}
      loading={isLoading}
      error={isError}
      onOpen={() => void refetch()}
      onItemClick={(item) => {
        if (!item.readAt) markRead.mutate(item.id);
        openInTab(item.link, tabTitle(item.link));
      }}
      onMarkAllRead={() => markAll.mutate()}
    />
  );
}

export default NotificationBell;
