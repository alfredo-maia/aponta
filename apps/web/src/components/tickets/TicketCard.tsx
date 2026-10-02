import { Link } from 'react-router-dom';
import type { Ticket, TicketPriority, TicketStatus } from '../../hooks/useTickets';
import { SlaBadge } from './SlaBadge';

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

export const statusBadgeClasses: Record<TicketStatus, string> = {
  OPEN: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-amber-100 text-amber-800',
  PENDING_CUSTOMER: 'bg-orange-100 text-orange-800 border-orange-200',
  ON_HOLD: 'bg-purple-100 text-purple-800 border-purple-200',
  PENDING_APPROVAL: 'bg-pink-100 text-pink-800 border-pink-200',
  ESCALATED: 'bg-red-200 text-red-900 border-red-300 font-bold',
  RESOLVED: 'bg-green-100 text-green-800 border-green-200',
  CLOSED: 'bg-gray-200 text-gray-700',
};

export const priorityBadgeClasses: Record<TicketPriority, string> = {
  LOW: 'bg-gray-100 text-gray-700',
  MEDIUM: 'bg-blue-100 text-blue-800',
  HIGH: 'bg-orange-100 text-orange-800',
  CRITICAL: 'bg-red-100 text-red-800',
};

interface TicketCardProps {
  ticket: Ticket;
}

export function TicketCard({ ticket }: TicketCardProps) {
  const hasSlaBadges = Boolean(
    ticket.responseSlaStatus || ticket.resolveSlaStatus,
  );

  return (
    <li className="rounded-lg border bg-background p-4">
      <Link to={`/tickets/${ticket.id}`} className="block">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <span className="font-mono text-xs text-muted-foreground">
              {ticket.protocol}
            </span>
            <h3 className="truncate text-base font-semibold">{ticket.title}</h3>
          </div>
          <div className="flex shrink-0 gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClasses[ticket.status]}`}
            >
              {statusLabels[ticket.status]}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${priorityBadgeClasses[ticket.priority]}`}
            >
              {priorityLabels[ticket.priority]}
            </span>
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
