export interface EzNotificationItem {
  id: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}

export interface EzNotificationBellProps {
  items: EzNotificationItem[];
  unreadCount: number;
  loading?: boolean;
  error?: boolean;
  onOpen?: () => void;
  onItemClick: (item: EzNotificationItem) => void;
  onMarkAllRead: () => void;
}

/** DMTE-462 T6: stub neutro (sem o comportamento), substituído na implementação. */
export function EzNotificationBell(_props: EzNotificationBellProps) {
  return null;
}

export default EzNotificationBell;
