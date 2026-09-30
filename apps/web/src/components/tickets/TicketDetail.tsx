import type { Ticket } from '../../hooks/useTickets';
import {
  priorityBadgeClasses,
  priorityLabels,
  statusBadgeClasses,
  statusLabels,
} from './TicketCard';

/**
 * Renders an ISO 8601 UTC timestamp as a stable, timezone-independent string
 * (e.g. "2026-09-30 14:00 UTC") so displayed SLA deadlines don't shift with
 * the viewer's locale or timezone.
 */
function formatDeadline(iso: string): string {
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
}

interface TicketDetailProps {
  ticket: Ticket;
}

export function TicketDetail({ ticket }: TicketDetailProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <span className="font-mono text-xs text-muted-foreground">
            {ticket.protocol}
          </span>
          <h1 className="text-2xl font-bold">{ticket.title}</h1>
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

      <p className="whitespace-pre-wrap text-sm">{ticket.description}</p>

      <dl className="grid gap-4 text-sm sm:grid-cols-2">
        <div className="space-y-1">
          <dt className="font-medium text-muted-foreground">
            Response deadline
          </dt>
          <dd>
            {ticket.responseDeadline
              ? formatDeadline(ticket.responseDeadline)
              : 'Not set'}
          </dd>
        </div>
        <div className="space-y-1">
          <dt className="font-medium text-muted-foreground">
            Resolve deadline
          </dt>
          <dd>
            {ticket.resolveDeadline
              ? formatDeadline(ticket.resolveDeadline)
              : 'Not set'}
          </dd>
        </div>
      </dl>
    </div>
  );
}

export default TicketDetail;
