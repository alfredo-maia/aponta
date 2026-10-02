import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import type { Ticket, TicketStatus } from '../../hooks/useTickets';
import {
  priorityBadgeClasses,
  priorityLabels,
  statusBadgeClasses,
  statusLabels,
} from './TicketCard';
import { SlaBadge } from './SlaBadge';
import { SlaProgress } from './SlaProgress';
import { TicketChecklist } from './TicketChecklist';
import { TicketParentChild } from './TicketParent';

/**
 * Renders an ISO 8601 UTC timestamp as a stable, timezone-independent string
 * (e.g. "2026-09-30 14:00 UTC") so displayed SLA deadlines don't shift with
 * the viewer's locale or timezone.
 */
function formatDeadline(iso: string): string {
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
}

interface TicketAudit {
  id: string;
  action: string;
  prevVal: string | null;
  newVal: string | null;
  createdAt: string;
  user: { name: string } | null;
}

/**
 * Human-readable (pt-BR) labels for status/priority raw enum values, so
 * the audit trail shows "Aberto" rather than "OPEN" where applicable.
 */
function auditValueLabel(raw: string | null): string {
  if (raw === null) {
    return 'Nenhum';
  }
  if (raw in statusLabels) {
    return statusLabels[raw as TicketStatus];
  }
  if (raw in priorityLabels) {
    return priorityLabels[raw as keyof typeof priorityLabels];
  }
  return raw;
}

/**
 * Renders a single audit entry as a plain-language sentence, e.g.
 * "Status alterado de Aberto para Em Andamento".
 */
function describeAudit(audit: TicketAudit): string {
  const prev = auditValueLabel(audit.prevVal);
  const next = auditValueLabel(audit.newVal);
  switch (audit.action) {
    case 'STATUS_CHANGED':
      return `Status alterado de ${prev} para ${next}`;
    case 'PRIORITY_CHANGED':
      return `Prioridade alterada de ${prev} para ${next}`;
    case 'ASSIGNED':
      return audit.prevVal
        ? 'Chamado reatribuído a outro atendente'
        : 'Chamado atribuído a um atendente';
    case 'SERVICE_DESK_CHANGED':
      return 'Chamado movido para outro departamento';
    default:
      return audit.action;
  }
}

interface TicketDetailProps {
  ticket: Ticket;
}

export function TicketDetail({ ticket }: TicketDetailProps) {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const isAgentOrAdmin = ['AGENT', 'AGENT_MASTER', 'ADMIN'].includes(user?.role as string);

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const res = await api.get<{ id: string; name: string }[]>('/users/agents');
      return res.data;
    },
    enabled: isAgentOrAdmin,
  });

  const { data: audits = [] } = useQuery({
    queryKey: ['tickets', ticket.id, 'audits'],
    queryFn: async () => {
      const res = await api.get<TicketAudit[]>(`/tickets/${ticket.id}/audits`);
      return res.data;
    },
    enabled: isAgentOrAdmin,
  });

  const assignMutation = useMutation({
    mutationFn: (agentId: string) =>
      api.patch(`/tickets/${ticket.id}/assign`, { agentId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets', ticket.id] });
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status: TicketStatus) =>
      api.patch(`/tickets/${ticket.id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets', ticket.id] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });

  const statusErrorMessage = statusMutation.isError
    ? 'Não foi possível alterar o status deste chamado. Verifique se a transição é permitida (ex.: é preciso passar por "Em Andamento" antes de "Resolvido").'
    : null;

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
            {user?.role === 'CLIENT' ? (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClasses[ticket.status]}`}
              >
                {statusLabels[ticket.status]}
              </span>
            ) : (
              <select
                id="ticket-status"
                aria-label="Status"
                className={`rounded-full outline-none px-2 py-0.5 text-xs font-medium border-none cursor-pointer ${statusBadgeClasses[ticket.status]}`}
                value={ticket.status}
                disabled={statusMutation.isPending}
                onChange={(e) => statusMutation.mutate(e.target.value as TicketStatus)}
              >
                {(Object.keys(statusLabels) as TicketStatus[]).map((st) => (
                  <option key={st} value={st}>
                    {statusLabels[st]}
                  </option>
                ))}
              </select>
            )}
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${priorityBadgeClasses[ticket.priority]}`}
            >
              {priorityLabels[ticket.priority]}
            </span>
          </div>
          
          {(['AGENT', 'AGENT_MASTER', 'ADMIN'].includes(user?.role as string)) && (
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

      {statusErrorMessage && (
        <p role="alert" className="rounded border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {statusErrorMessage}
        </p>
      )}

      <dl className="grid gap-4 text-sm sm:grid-cols-2">
        <div className="space-y-1">
          <dt className="font-medium text-muted-foreground">
            Prazo de resposta
          </dt>
          <dd className="flex items-center gap-2">
            {ticket.responseDeadline
              ? formatDeadline(ticket.responseDeadline)
              : 'Não definido'}
            <SlaBadge status={ticket.responseSlaStatus} label="SLA" />
          </dd>
        </div>
        <div className="space-y-1">
          <dt className="font-medium text-muted-foreground">
            Prazo de resolução
          </dt>
          <dd className="flex items-center gap-2">
            {ticket.resolveDeadline
              ? formatDeadline(ticket.resolveDeadline)
              : 'Não definido'}
            <SlaBadge status={ticket.resolveSlaStatus} label="SLA" />
          </dd>
        </div>
      </dl>
      <SlaProgress ticket={ticket} />

      {isAgentOrAdmin && (
        <>

        <TicketChecklist ticketId={ticket.id} />
          <TicketParentChild ticket={ticket} />

      <section className="space-y-2">
          <h2 className="text-lg font-semibold">Histórico</h2>
          {audits.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma alteração registrada ainda.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {audits.map((audit) => (
                <li
                  key={audit.id}
                  className="flex items-start justify-between gap-4 rounded border px-3 py-2"
                >
                  <span>{describeAudit(audit)}</span>
                  <span className="shrink-0 text-right text-xs text-muted-foreground">
                    {audit.user?.name ?? 'Sistema'}
                    <br />
                    {formatDeadline(audit.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
        </>
      )}
    </div>
  );
}

export default TicketDetail;
