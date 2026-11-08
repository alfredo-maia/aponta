import type { TicketFiltersInput } from '../../hooks/useTickets';
import { EzButton, EzTag } from '../ds';
import { priorityLabels, statusLabels } from './TicketCard';

interface TicketActiveFiltersProps {
  filters: TicketFiltersInput;
  onReset: () => void;
}

/** Rótulos dos filtros ativos. Os que guardam só um id (mesa, cliente...) mostram o nome do campo, não o valor. */
function describeFilters(filters: TicketFiltersInput): string[] {
  const entries: Array<[unknown, string]> = [
    [filters.status, `Status: ${filters.status ? statusLabels[filters.status] : ''}`],
    [filters.priority, `Prioridade: ${filters.priority ? priorityLabels[filters.priority] : ''}`],
    [filters.search, `Busca: ${filters.search}`],
    [filters.number, `Número: ${filters.number}`],
    [filters.titleContains, `Título: ${filters.titleContains}`],
    [filters.requesterQuery, `Solicitante: ${filters.requesterQuery}`],
    [filters.serviceDeskId, 'Mesa de serviço'],
    [filters.organizationId, 'Cliente'],
    [filters.agentId, 'Atendente'],
    [filters.stageId, 'Estágio'],
    [filters.dateFrom || filters.dateTo, 'Período'],
    [filters.mine, 'Meus'],
    [filters.unassigned, 'Não atendidos'],
    [filters.paused, 'Pausados'],
    [filters.overdue, 'Vencidos'],
    [filters.notClosed, 'Abertos'],
    [filters.closedOnly, 'Fechados'],
  ];
  return entries.filter(([active]) => Boolean(active)).map(([, label]) => label);
}

/**
 * Filtros ativos da Lista (vindos da URL ou da Busca avançada) com ação de redefinir.
 * Página, ordenação e o filtro por avatar do Kanban não contam. Sem filtros, não renderiza nada.
 */
export function TicketActiveFilters({ filters, onReset }: TicketActiveFiltersProps) {
  const labels = describeFilters(filters);
  if (labels.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div role="group" aria-label="Filtros ativos" className="flex flex-wrap items-center gap-2">
        {labels.map((label) => (
          <EzTag key={label} label={label} variant="gray" />
        ))}
      </div>
      <EzButton variant="tertiary" size="small" label="Redefinir filtros" onClick={onReset} />
    </div>
  );
}

export default TicketActiveFilters;
