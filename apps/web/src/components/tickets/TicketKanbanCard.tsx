import type { MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { MoreVertical } from 'lucide-react';
import type { Ticket } from '../../hooks/useTickets';
import { EzAvatar, EzDropdown, EzSlaChip, EzTag } from '../ds';
import { useOpenInTab } from '../../contexts/TabsContext';
import { statusLabels, priorityLabels, statusTagVariants, priorityTagVariants } from './TicketCard';

/** D6c "Exibir campos": optional card fields the Kanban's Configurações
 * popover can toggle. Título/Número are always shown (SPEC D6c/D7), so they
 * have no entry here. Omitted/undefined keeps the pre-existing behavior
 * (back-compat default: agent/client/sla visible, dates hidden) for callers
 * that don't wire a config — only `TicketKanban` passes real values. */
export interface TicketKanbanCardVisibleFields {
  agent?: boolean;
  client?: boolean;
  sla?: boolean;
  createdAt?: boolean;
  updatedAt?: boolean;
}

interface TicketKanbanCardProps {
  ticket: Ticket;
  /** D6 Configurações "Tag": Status (padrão) ou Prioridade. */
  tagField?: 'status' | 'priority';
  visibleFields?: TicketKanbanCardVisibleFields;
}

/** DMTE-461: cor do card pela prioridade (Crítica vermelho, Alta amarelo, Média verde, Baixa azul-petróleo). */
const priorityCardClasses: Record<Ticket['priority'], string> = {
  CRITICAL: 'border-red-300 bg-red-100',
  HIGH: 'border-yellow-300 bg-yellow-100',
  MEDIUM: 'border-green-300 bg-green-100',
  LOW: 'border-petroleum-300 bg-petroleum-100',
};

function formatCardDate(value: string | null | undefined): string | null {
  if (!value) return null;
  return new Date(value).toLocaleDateString('pt-BR');
}

/** Prazo efetivo: o gravado mais as pausas acumuladas e a pausa em curso, como em `getSlaStatus` (apps/api). */
function effectiveDeadline(deadline: string | null, ticket: Ticket, now: Date): string | null {
  if (!deadline) return null;
  const pausedMs = (ticket.slaAccumulatedPauseTime || 0) * 60000;
  const currentPauseMs = ticket.slaPausedAt
    ? Math.max(0, now.getTime() - new Date(ticket.slaPausedAt).getTime())
    : 0;
  return new Date(new Date(deadline).getTime() + pausedMs + currentPauseMs).toISOString();
}

/**
 * Card do Kanban redesenhado (SPEC DMTE-137 D7): sem apontamento/play inline
 * — o menu só abre o ticket (nesta aba interna ou, por nome, "em nova aba
 * interna"; o modelo de abas já evita duplicar, ver TabsContext).
 */
export function TicketKanbanCard({
  ticket,
  tagField = 'status',
  visibleFields,
}: TicketKanbanCardProps) {
  const openInTab = useOpenInTab();
  const now = new Date();
  const path = `/tickets/${ticket.id}`;
  const tabTitle = `#${ticket.protocol} - ${ticket.title}`;
  const showClient = visibleFields?.client !== false;
  const showAgent = visibleFields?.agent !== false;
  const showSla = visibleFields?.sla !== false;
  const showCreatedAt = visibleFields?.createdAt === true;
  const showUpdatedAt = visibleFields?.updatedAt === true;
  const hasSlaBadges =
    showSla && Boolean(ticket.responseSlaStatus || ticket.resolveSlaStatus);
  const createdAtLabel = showCreatedAt ? formatCardDate(ticket.createdAt) : null;
  const updatedAtLabel = showUpdatedAt ? formatCardDate(ticket.updatedAt) : null;

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) {
      return;
    }
    event.preventDefault();
    openInTab(path, tabTitle);
  };

  return (
    <li className={`list-none rounded-[8px] border p-3 shadow-xs transition-shadow hover:shadow-sm ${priorityCardClasses[ticket.priority] ?? 'border-gray-200 bg-white'}`}>
      <Link
        to={path}
        onClick={handleClick}
        aria-label={`#${ticket.protocol} - ${ticket.title}`}
        className="block rounded-[8px] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[12px] font-semibold text-brand-600">
            #{ticket.protocol}
          </span>
          <span onClick={(e) => e.stopPropagation()}>
            <EzDropdown
              align="right"
              trigger={<MoreVertical className="h-4 w-4 text-gray-400" />}
              aria-label="Mais ações"
              options={[
                { label: 'Abrir ticket', onClick: () => openInTab(path, tabTitle) },
                { label: 'Abrir em nova aba interna', onClick: () => openInTab(path, tabTitle) },
              ]}
            />
          </span>
        </div>

        <p
          title={ticket.title}
          className="mt-1 line-clamp-2 text-[13px] font-medium text-gray-900"
        >
          {ticket.title}
        </p>

        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="truncate text-[12px] text-gray-500">
            {showClient ? ticket.requester?.organization?.name ?? '—' : ''}
          </span>
          {tagField === 'priority' ? (
            <EzTag label={priorityLabels[ticket.priority]} variant={priorityTagVariants[ticket.priority]} />
          ) : (
            <EzTag label={statusLabels[ticket.status]} variant={statusTagVariants[ticket.status]} />
          )}
        </div>

        {(createdAtLabel || updatedAtLabel) && (
          <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-gray-400">
            {createdAtLabel && <span>Criado em {createdAtLabel}</span>}
            {updatedAtLabel && <span>Atualizado em {updatedAtLabel}</span>}
          </div>
        )}

        {(hasSlaBadges || (showAgent && ticket.agent)) && (
          <div
            data-testid="kanban-card-footer"
            className="mt-2 flex items-center justify-between gap-2"
          >
            <div className="flex flex-wrap gap-1">
              {hasSlaBadges && (
                <>
                  <EzSlaChip
                    kind="response"
                    status={ticket.responseSlaStatus}
                    deadline={effectiveDeadline(ticket.responseDeadline, ticket, now)}
                    now={now}
                  />
                  <EzSlaChip
                    kind="resolve"
                    status={ticket.resolveSlaStatus}
                    deadline={effectiveDeadline(ticket.resolveDeadline, ticket, now)}
                    now={now}
                  />
                </>
              )}
            </div>
            {showAgent && ticket.agent && (
              <EzAvatar name={ticket.agent.name} size={24} className="ring-2 ring-white" />
            )}
          </div>
        )}
      </Link>
    </li>
  );
}

export default TicketKanbanCard;
