import { Fragment, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { Ticket } from '../../hooks/useTickets';
import { EzAlert, EzEmptyCard, EzSelect, EzSpinner, EzTag } from '../ds';
import { statusLabels, priorityLabels, statusTagVariants, priorityTagVariants } from './TicketCard';
import { useUserScreenConfig } from '../../hooks/useUserScreenConfig';
import { useOpenInTab } from '../../contexts/TabsContext';
import { useAuthStore } from '../../stores/authStore';

const sourceLabels: Record<string, string> = {
  WEB: 'Web',
  EMAIL: 'E-mail',
  WHATSAPP: 'WhatsApp',
};

interface ColumnDef {
  id: string;
  label: string;
  /** Whitelisted backend `sortBy` field (D8) — omit for columns with no server-side sort support. */
  sortField?: string;
  render: (ticket: Ticket) => ReactNode;
  defaultVisible: boolean;
  /** The API only sends this data to staff (ADMIN/AGENT_MASTER/AGENT), so CLIENT roles never get the column. */
  staffOnly?: boolean;
}

function formatDateTime(value: string | null | undefined): ReactNode {
  if (!value) return <span className="text-gray-400">—</span>;
  const date = new Date(value);
  return (
    <span>
      {date.toLocaleDateString('pt-BR')}{' '}
      {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
    </span>
  );
}

const COLUMNS: ColumnDef[] = [
  {
    id: 'number',
    label: 'Número',
    sortField: 'protocol',
    defaultVisible: true,
    render: (t) => <span className="whitespace-nowrap font-mono text-[12px]">{t.protocol}</span>,
  },
  {
    id: 'title',
    label: 'Título',
    sortField: 'title',
    defaultVisible: true,
    render: (t) => <span className="block min-w-[14rem] font-medium text-gray-900">{t.title}</span>,
  },
  {
    id: 'client',
    label: 'Cliente',
    defaultVisible: true,
    render: (t) => <span>{t.requester?.organization?.name ?? '—'}</span>,
  },
  {
    id: 'origin',
    label: 'Origem',
    defaultVisible: true,
    render: (t) => <span>{sourceLabels[t.source ?? 'WEB'] ?? '—'}</span>,
  },
  {
    id: 'priority',
    label: 'Prioridade',
    sortField: 'priority',
    defaultVisible: true,
    render: (t) => <EzTag label={priorityLabels[t.priority]} variant={priorityTagVariants[t.priority]} />,
  },
  {
    id: 'status',
    label: 'Status',
    sortField: 'status',
    defaultVisible: true,
    render: (t) => <EzTag label={statusLabels[t.status]} variant={statusTagVariants[t.status]} />,
  },
  {
    id: 'stage',
    label: 'Estágio',
    defaultVisible: true,
    render: (t) => <span>{t.stage?.name ?? '—'}</span>,
  },
  {
    id: 'serviceDesk',
    label: 'Mesa de serviço',
    defaultVisible: false,
    render: (t) => <span>{t.serviceDesk?.displayName ?? t.serviceDesk?.name ?? '—'}</span>,
  },
  {
    id: 'resourceGroup',
    label: 'Grupo de recursos',
    defaultVisible: false,
    render: (t) => <span>{t.resourceGroup || '—'}</span>,
  },
  {
    id: 'agent',
    label: 'Responsável',
    sortField: 'agentId',
    defaultVisible: false,
    render: (t) => <span>{t.agent?.name ?? 'Não atribuído'}</span>,
  },
  {
    id: 'requester',
    label: 'Solicitante',
    defaultVisible: false,
    render: (t) => <span>{t.requester?.name ?? '—'}</span>,
  },
  {
    id: 'requesterEmail',
    label: 'E-mail do solicitante',
    defaultVisible: false,
    render: (t) => <span>{t.requester?.email || '—'}</span>,
  },
  {
    id: 'requesterPhone',
    label: 'Telefone do solicitante',
    defaultVisible: false,
    staffOnly: true,
    render: (t) => <span>{t.requester?.phone || '—'}</span>,
  },
  {
    id: 'requesterExtension',
    label: 'Ramal do solicitante',
    defaultVisible: false,
    staffOnly: true,
    render: (t) => <span>{t.requester?.extension || '—'}</span>,
  },
  {
    id: 'createdAt',
    label: 'Criado em',
    sortField: 'createdAt',
    defaultVisible: false,
    render: (t) => formatDateTime(t.createdAt),
  },
  {
    id: 'updatedAt',
    label: 'Atualizado em',
    sortField: 'updatedAt',
    defaultVisible: false,
    render: (t) => formatDateTime(t.updatedAt),
  },
  {
    id: 'responseDeadline',
    label: 'Vencimento de atendimento',
    sortField: 'responseDeadline',
    defaultVisible: false,
    render: (t) => formatDateTime(t.responseDeadline),
  },
  {
    id: 'resolveDeadline',
    label: 'Vencimento de solução',
    sortField: 'resolveDeadline',
    defaultVisible: false,
    render: (t) => formatDateTime(t.resolveDeadline),
  },
];

const DEFAULT_COLUMN_VISIBILITY = COLUMNS.reduce<Record<string, boolean>>((acc, col) => {
  acc[col.id] = col.defaultVisible;
  return acc;
}, {});

interface GroupOption {
  id: string;
  label: string;
  keyOf: (ticket: Ticket) => string;
}

const GROUP_OPTIONS: GroupOption[] = [
  { id: 'none', label: 'Nenhum', keyOf: () => '' },
  { id: 'organization', label: 'Cliente', keyOf: (t) => t.requester?.organization?.name ?? 'Sem cliente' },
  { id: 'stage', label: 'Estágio', keyOf: (t) => t.stage?.name ?? 'Sem estágio' },
  { id: 'status', label: 'Status', keyOf: (t) => statusLabels[t.status] },
  { id: 'priority', label: 'Prioridade', keyOf: (t) => priorityLabels[t.priority] },
  { id: 'agent', label: 'Responsável', keyOf: (t) => t.agent?.name ?? 'Não atribuído' },
  { id: 'serviceDesk', label: 'Mesa de serviço', keyOf: (t) => t.serviceDesk?.displayName ?? t.serviceDesk?.name ?? 'Sem mesa' },
  { id: 'requester', label: 'Solicitante', keyOf: (t) => t.requester?.name ?? 'Sem solicitante' },
];

interface TicketListProps {
  tickets: Ticket[];
  isLoading: boolean;
  isError: boolean;
  /** Used only to render the R1 grouping-caveat note (grouping only sees the current page). */
  totalPages?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  onSortChange?: (sortBy: string, sortDir: 'asc' | 'desc') => void;
}

export function TicketList({
  tickets,
  isLoading,
  isError,
  totalPages,
  sortBy: initialSortBy,
  sortDir: initialSortDir,
  onSortChange,
}: TicketListProps) {
  const openInTab = useOpenInTab();
  const role = useAuthStore((state) => state.user?.role);
  const isClientRole = role === 'CLIENT' || role === 'CLIENT_MASTER';
  const columns = isClientRole ? COLUMNS.filter((col) => !col.staffOnly) : COLUMNS;
  const { config, setGroupBy, setColumnVisibility } = useUserScreenConfig('tickets-list', {
    groupBy: 'none',
    grid: { columnVisibility: DEFAULT_COLUMN_VISIBILITY, density: 'compact' },
  });
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);
  const [sort, setSort] = useState<{ field?: string; dir: 'asc' | 'desc' }>({
    field: initialSortBy,
    dir: initialSortDir ?? 'asc',
  });

  const handleSortClick = (field: string) => {
    const nextDir: 'asc' | 'desc' = sort.field === field && sort.dir === 'asc' ? 'desc' : 'asc';
    setSort({ field, dir: nextDir });
    onSortChange?.(field, nextDir);
  };

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <EzSpinner label="Carregando chamados…" />
      </div>
    );
  }

  if (isError) {
    return (
      <EzAlert variant="error">
        Falha ao carregar os chamados. Tente novamente.
      </EzAlert>
    );
  }

  const visibleColumns = columns.filter((col) => config.grid.columnVisibility[col.id] !== false);
  const groupOption = GROUP_OPTIONS.find((g) => g.id === config.groupBy) ?? GROUP_OPTIONS[0];
  const isGrouped = groupOption.id !== 'none';

  const groups = isGrouped
    ? tickets.reduce<Map<string, Ticket[]>>((acc, ticket) => {
        const key = groupOption.keyOf(ticket);
        const bucket = acc.get(key) ?? [];
        bucket.push(ticket);
        acc.set(key, bucket);
        return acc;
      }, new Map())
    : null;

  const renderRow = (ticket: Ticket) => (
    <tr
      key={ticket.id}
      className="border-b border-gray-100 last:border-0 hover:bg-gray-80 cursor-pointer"
      onClick={() => openInTab(`/tickets/${ticket.id}`, `#${ticket.protocol} - ${ticket.title}`)}
    >
      {visibleColumns.map((col) => (
        <td key={col.id} className="px-3 py-2 text-[13px] text-gray-700">
          {col.render(ticket)}
        </td>
      ))}
    </tr>
  );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="ticket-list-group-by" className="text-[13px] font-medium text-gray-700">
          Agrupar por
        </label>
        <EzSelect
          id="ticket-list-group-by"
          aria-label="Agrupar por"
          variant="compact"
          className="w-auto"
          value={config.groupBy || 'none'}
          onChange={(e) => setGroupBy(e.target.value)}
        >
          {GROUP_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </EzSelect>

        <div className="relative">
          <button
            type="button"
            onClick={() => setIsColumnMenuOpen((prev) => !prev)}
            className="h-[var(--control-height-compact)] rounded-control border border-gray-200 bg-white px-3 text-[13px] font-medium text-gray-700 hover:bg-gray-90"
          >
            Exibir colunas
          </button>
          {isColumnMenuOpen && (
            <div className="absolute z-10 mt-1 w-56 rounded-control border border-gray-200 bg-white p-2 shadow-popover">
              {columns.map((col) => (
                <label key={col.id} className="flex items-center gap-2 px-1 py-1 text-[13px]">
                  <input
                    type="checkbox"
                    checked={config.grid.columnVisibility[col.id] !== false}
                    onChange={(e) =>
                      setColumnVisibility((prev) => ({ ...prev, [col.id]: e.target.checked }))
                    }
                  />
                  {col.label}
                </label>
              ))}
            </div>
          )}
        </div>

        {isGrouped && totalPages && totalPages > 1 && (
          <span className="text-[12px] text-gray-500">
            Agrupando os {tickets.length} chamados desta página.
          </span>
        )}
      </div>

      {tickets.length === 0 ? (
        <EzEmptyCard
          title="Nenhum chamado encontrado"
          description="Tente ajustar os filtros."
        />
      ) : (
        <div
          role="region"
          aria-label="Tabela de chamados"
          tabIndex={0}
          className="overflow-x-auto rounded-control border border-gray-200 bg-white outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-80">
                {visibleColumns.map((col) => (
                  <th key={col.id} className="px-3 py-2 text-[12px] font-semibold text-gray-600">
                    {col.sortField ? (
                      <button
                        type="button"
                        onClick={() => handleSortClick(col.sortField as string)}
                        className="cursor-pointer hover:text-gray-900"
                      >
                        {col.label}
                      </button>
                    ) : (
                      col.label
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isGrouped
                ? Array.from(groups ?? []).map(([groupKey, groupTickets]) => {
                    const isExpanded = expandedGroups.has(groupKey);
                    return (
                      <Fragment key={groupKey}>
                        <tr className="bg-gray-80">
                          <td colSpan={visibleColumns.length} className="px-3 py-2">
                            <button
                              type="button"
                              aria-expanded={isExpanded}
                              onClick={() => toggleGroup(groupKey)}
                              className="flex w-full cursor-pointer items-center gap-2 rounded-control text-left text-[13px] font-semibold text-gray-900 outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                            >
                              {isExpanded ? (
                                <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-gray-500" />
                              ) : (
                                <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-gray-500" />
                              )}
                              <span>
                                {groupKey} ({groupTickets.length})
                              </span>
                            </button>
                          </td>
                        </tr>
                        {isExpanded && groupTickets.map(renderRow)}
                      </Fragment>
                    );
                  })
                : tickets.map(renderRow)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default TicketList;
