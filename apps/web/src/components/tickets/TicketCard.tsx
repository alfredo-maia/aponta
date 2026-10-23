import type { MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import type { Ticket, TicketPriority, TicketStatus } from '../../hooks/useTickets';
import { SlaBadge } from './SlaBadge';
import { EzTag } from '../ds';
import { useOpenInTab } from '../../contexts/TabsContext';

export const statusLabels: Record<TicketStatus, string> = {
  OPEN: 'Aberto',
  IN_PROGRESS: 'Em Andamento',
  PENDING_CUSTOMER: 'Aguardando Cliente',
  ON_HOLD: 'Aguardando Terceiros',
  PENDING_APPROVAL: 'Aguardando Aprovação',
  ESCALATED: 'Escalonado',
  RESOLVED: 'Resolvido',
  CLOSED: 'Fechado',
};

export const priorityLabels: Record<TicketPriority, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
};

export const statusTagVariants: Record<
  TicketStatus,
  'ocean' | 'gray' | 'green' | 'yellow' | 'red' | 'petroleum' | 'outline'
> = {
  OPEN: 'ocean',
  IN_PROGRESS: 'yellow',
  PENDING_CUSTOMER: 'yellow',
  ON_HOLD: 'petroleum',
  PENDING_APPROVAL: 'petroleum',
  ESCALATED: 'red',
  RESOLVED: 'green',
  CLOSED: 'gray',
};

export const priorityTagVariants: Record<
  TicketPriority,
  'ocean' | 'gray' | 'green' | 'yellow' | 'red' | 'petroleum' | 'outline'
> = {
  LOW: 'gray',
  MEDIUM: 'ocean',
  HIGH: 'yellow',
  CRITICAL: 'red',
};

interface TicketCardProps {
  ticket: Ticket;
}

export function TicketCard({ ticket }: TicketCardProps) {
  const hasSlaBadges = Boolean(
    ticket.responseSlaStatus || ticket.resolveSlaStatus,
  );
  const openInTab = useOpenInTab();
  const path = `/tickets/${ticket.id}`;
  const tabTitle = `#${ticket.protocol} - ${ticket.title}`;

  // Internal navigation opens/activates a workspace tab instead of a real
  // browser tab (D2) — but Ctrl/Cmd/Shift+click or a middle-click must
  // still fall through to the anchor's native "open in a new browser tab"
  // behavior, so only a plain left click is intercepted here.
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) {
      return;
    }
    event.preventDefault();
    openInTab(path, tabTitle);
  };

  return (
    <li className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <Link to={path} onClick={handleClick} className="block">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <span className="font-mono text-xs text-gray-500">
              {ticket.protocol}
            </span>
            <h3 className="truncate text-base font-semibold text-gray-900">
              {ticket.title}
            </h3>
          </div>
          <div className="flex shrink-0 gap-2">
            <EzTag
              label={statusLabels[ticket.status]}
              variant={statusTagVariants[ticket.status]}
            />
            <EzTag
              label={priorityLabels[ticket.priority]}
              variant={priorityTagVariants[ticket.priority]}
            />
          </div>
        </div>
        {hasSlaBadges && (
          <div className="mt-2 flex flex-wrap gap-2">
            <SlaBadge status={ticket.responseSlaStatus} label="Resposta" />
            <SlaBadge status={ticket.resolveSlaStatus} label="Resolução" />
          </div>
        )}
      </Link>
    </li>
  );
}

export default TicketCard;
