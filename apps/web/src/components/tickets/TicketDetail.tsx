import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import type { Ticket, TicketStatus } from '../../hooks/useTickets';
import {
  priorityLabels,
  priorityTagVariants,
  statusLabels,
  statusTagVariants,
} from './TicketCard';
import { SlaBadge } from './SlaBadge';
import { SlaProgress } from './SlaProgress';
import { TicketChecklist } from './TicketChecklist';
import { TicketParentChild } from './TicketParent';
import { EzAlert, EzTag } from '../ds';

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
          <span className="font-mono text-xs text-gray-500">
            {ticket.protocol}
          </span>
          <h1 className="text-2xl font-bold text-gray-900">{ticket.title}</h1>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            {user?.role === 'CLIENT' ? (
              <EzTag
                label={statusLabels[ticket.status]}
                variant={statusTagVariants[ticket.status]}
              />
            ) : (
              <select
                id="ticket-status"
                aria-label="Status"
                className="h-7 cursor-pointer rounded-full border border-gray-200 bg-white px-3 text-xs font-medium text-gray-900 outline-none transition-colors hover:border-gray-300 focus:border-brand-600 focus:ring-1 focus:ring-brand-600 disabled:opacity-50"
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
            <EzTag
              label={priorityLabels[ticket.priority]}
              variant={priorityTagVariants[ticket.priority]}
            />
          </div>

          {(['AGENT', 'AGENT_MASTER', 'ADMIN'].includes(user?.role as string)) && (
            <div className="mt-2 flex items-center gap-2 text-sm">
              <label htmlFor="assignee" className="text-gray-500">
                Atribuído a:
              </label>
              <select
                id="assignee"
                className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none transition-colors hover:border-gray-300 focus:border-brand-600 focus:ring-1 focus:ring-brand-600 disabled:opacity-50"
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

      <p className="whitespace-pre-wrap text-sm text-gray-900">
        {ticket.description}
      </p>

      {statusErrorMessage && (
        <EzAlert variant="error" role="alert">
          {statusErrorMessage}
        </EzAlert>
      )}

      <dl className="grid gap-4 text-sm sm:grid-cols-2">
        <div className="space-y-1">
          <dt className="font-medium text-gray-500">Prazo de resposta</dt>
          <dd className="flex items-center gap-2 text-gray-900">
            {ticket.responseDeadline
              ? formatDeadline(ticket.responseDeadline)
              : 'Não definido'}
            <SlaBadge status={ticket.responseSlaStatus} label="SLA" />
          </dd>
        </div>
        <div className="space-y-1">
          <dt className="font-medium text-gray-500">Prazo de resolução</dt>
          <dd className="flex items-center gap-2 text-gray-900">
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
            <h2 className="text-lg font-semibold text-gray-900">Histórico</h2>
            {audits.length === 0 ? (
              <p className="text-sm text-gray-500">
                Nenhuma alteração registrada ainda.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {audits.map((audit) => (
                  <li
                    key={audit.id}
                    className="flex items-start justify-between gap-4 rounded-lg border border-gray-200 bg-white px-3 py-2"
                  >
                    <span className="text-gray-900">{describeAudit(audit)}</span>
                    <span className="shrink-0 text-right text-xs text-gray-500">
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
