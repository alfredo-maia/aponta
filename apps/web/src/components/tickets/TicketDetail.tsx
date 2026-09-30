import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
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
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const res = await api.get<{ id: string; name: string }[]>('/users/agents');
      return res.data;
    },
    enabled: user?.role === 'AGENT' || user?.role === 'ADMIN',
  });

  const assignMutation = useMutation({
    mutationFn: (agentId: string) =>
      api.patch(`/tickets/${ticket.id}/assign`, { agentId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets', ticket.id] });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <span className="font-mono text-xs text-muted-foreground">
            {ticket.protocol}
          </span>
          <h1 className="text-2xl font-bold">{ticket.title}</h1>
        </div>
        <div className="flex flex-col shrink-0 gap-2 items-end">
          <div className="flex gap-2">
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
          
          {(user?.role === 'AGENT' || user?.role === 'ADMIN') && (
            <div className="mt-2 text-sm">
              <label htmlFor="assignee" className="mr-2 text-muted-foreground">Atribuído a:</label>
              <select
                id="assignee"
                className="rounded border px-2 py-1 text-sm disabled:opacity-50"
                value={ticket.agentId || ''}
                disabled={assignMutation.isPending}
                onChange={(e) => assignMutation.mutate(e.target.value)}
              >
                <option value="">Não atribuído</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <p className="whitespace-pre-wrap text-sm">{ticket.description}</p>

      <dl className="grid gap-4 text-sm sm:grid-cols-2">
        <div className="space-y-1">
          <dt className="font-medium text-muted-foreground">
            Prazo de resposta
          </dt>
          <dd>
            {ticket.responseDeadline
              ? formatDeadline(ticket.responseDeadline)
              : 'Não definido'}
          </dd>
        </div>
        <div className="space-y-1">
          <dt className="font-medium text-muted-foreground">
            Prazo de resolução
          </dt>
          <dd>
            {ticket.resolveDeadline
              ? formatDeadline(ticket.resolveDeadline)
              : 'Não definido'}
          </dd>
        </div>
      </dl>
    </div>
  );
}

export default TicketDetail;
