import { useState } from 'react';
import { Bell } from 'lucide-react';
import { useEscapeLayer } from '../../hooks/useEscapeLayer';
import { EzAlert } from './EzAlert';
import { EzBadge } from './EzBadge';
import { EzButton } from './EzButton';
import { EzPopover } from './EzPopover';
import { cn } from './utils';

export interface EzNotificationItem {
  id: string;
  title: string;
  body: string;
  /** Nulo enquanto não lida. */
  readAt: string | null;
  createdAt: string;
}

export interface EzNotificationBellProps<T extends EzNotificationItem = EzNotificationItem> {
  items: T[];
  unreadCount: number;
  loading?: boolean;
  error?: boolean;
  /** Chamado ao abrir o painel (não ao fechar): quem usa recarrega a lista. */
  onOpen?: () => void;
  onItemClick: (item: T) => void;
  onMarkAllRead: () => void;
}

const when = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' });

/**
 * Aponta DS Notification Bell
 * Sino com contador ("9+" acima de 9) e painel com a lista de notificações, as não lidas destacadas.
 * Só apresenta: dados, marcar como lida e navegação ficam com quem usa.
 */
export function EzNotificationBell<T extends EzNotificationItem>({ items, unreadCount, loading = false, error = false, onOpen, onItemClick, onMarkAllRead }: EzNotificationBellProps<T>) {
  const [open, setOpen] = useState(false);
  useEscapeLayer(() => setOpen(false), open);
  return (
    <EzPopover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) onOpen?.();
      }}
      align="right"
      className="w-[22rem] max-w-[calc(100vw-1.5rem)] p-0"
      trigger={
        <button
          type="button"
          aria-label={unreadCount > 0 ? `Notificações, ${unreadCount} não lidas` : 'Notificações'}
          aria-expanded={open}
          aria-haspopup="true"
          className="relative inline-flex h-11 w-11 touch-manipulation items-center justify-center rounded-control text-gray-700 outline-none hover:bg-gray-80 focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <Bell aria-hidden="true" className="h-5 w-5" />
          {unreadCount > 0 && (
            <EzBadge data-testid="notification-count" size="x-small" className="absolute right-0.5 top-0.5 min-w-[1.25rem] px-1">
              {unreadCount > 9 ? '9+' : unreadCount}
            </EzBadge>
          )}
        </button>
      }
      content={
        <div className="flex flex-col">
          <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-4 py-3">
            <h2 className="text-[14px] font-semibold text-gray-900">Notificações</h2>
            <EzButton size="small" variant="secondary" disabled={unreadCount === 0} onClick={onMarkAllRead}>
              Marcar todas como lidas
            </EzButton>
          </div>
          <div className="max-h-[24rem] overflow-y-auto">
            {error && items.length === 0 ? (
              <EzAlert variant="error" className="m-3 w-auto">Erro ao carregar as notificações.</EzAlert>
            ) : loading && items.length === 0 ? (
              <p role="status" className="px-4 py-6 text-[13px] text-gray-600">Carregando…</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-6 text-[13px] text-gray-600">Nenhuma notificação.</p>
            ) : (
              <ul>
                {items.map((item) => (
                  <li key={item.id} className="border-t border-gray-100 first:border-t-0">
                    <button
                      type="button"
                      data-notification-id={item.id}
                      data-unread={item.readAt ? undefined : 'true'}
                      onClick={() => {
                        setOpen(false);
                        onItemClick(item);
                      }}
                      className={cn(
                        'block w-full touch-manipulation px-4 py-3 text-left outline-none hover:bg-gray-80 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500',
                        item.readAt ? 'bg-white' : 'bg-brand-50',
                      )}
                    >
                      <span className={cn('block text-[13px] text-gray-900', !item.readAt && 'font-semibold')}>
                        {!item.readAt && <span className="sr-only">Não lida. </span>}
                        {item.title}
                      </span>
                      <span className="mt-0.5 block text-[12px] text-gray-700">{item.body}</span>
                      <span className="mt-1 block text-[11px] tabular-nums text-gray-500">{when(item.createdAt)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      }
    />
  );
}

export default EzNotificationBell;
