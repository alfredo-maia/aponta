import type { Ticket, TicketPriority, TicketStatus } from '../../hooks/useTickets';

export const statusLabels: Record<TicketStatus, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

export const priorityLabels: Record<TicketPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

const statusBadgeClasses: Record<TicketStatus, string> = {
  OPEN: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-amber-100 text-amber-800',
  RESOLVED: 'bg-green-100 text-green-800',
  CLOSED: 'bg-gray-200 text-gray-700',
};

const priorityBadgeClasses: Record<TicketPriority, string> = {
  LOW: 'bg-gray-100 text-gray-700',
  MEDIUM: 'bg-blue-100 text-blue-800',
  HIGH: 'bg-orange-100 text-orange-800',
  CRITICAL: 'bg-red-100 text-red-800',
};

interface TicketCardProps {
  ticket: Ticket;
}

export function TicketCard({ ticket }: TicketCardProps) {
  return (
    <li className="rounded-lg border bg-background p-4">
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
    </li>
  );
}

export default TicketCard;
