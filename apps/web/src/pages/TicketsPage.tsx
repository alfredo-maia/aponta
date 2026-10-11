import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { TicketFilters } from '../components/tickets/TicketFilters';
import { TicketList } from '../components/tickets/TicketList';
import { TicketKanban } from '../components/tickets/TicketKanban';
import {
  statusLabels,
  priorityLabels,
  statusTagVariants,
  priorityTagVariants,
} from '../components/tickets/TicketCard';
import { EzEntityGrid } from '../components/ds/EzEntityGrid';
import { EzTag, EzAlert, EzSpinner } from '../components/ds';
import type { Ticket, TicketFiltersInput } from '../hooks/useTickets';
import { useTickets } from '../hooks/useTickets';
import { useAuthStore } from '../stores/authStore';
import { cn } from '../components/ds/utils';

type ViewMode = 'list' | 'kanban' | 'grid';

export function TicketsPage() {
  const [filters, setFilters] = useState<TicketFiltersInput>({});
  const { data, isLoading, isError } = useTickets(filters);
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();

  // Agentes default to Kanban, Clients default to list
  const [viewMode, setViewMode] = useState<ViewMode>(user?.role === 'CLIENT' ? 'list' : 'kanban');

  // Sync: se client, trava em list ou grid
  useEffect(() => {
    if (user?.role === 'CLIENT' && viewMode === 'kanban') {
      setViewMode('list');
    }
  }, [user?.role, viewMode]);

  const tickets = data?.data ?? [];
  const meta = data?.meta;
  const currentPage = filters.page ?? 1;

  const handleFiltersChange = (next: TicketFiltersInput) => {
    // Any filter/search change resets back to page 1 so results aren't
    // scoped to a page number that may no longer exist under the new query.
    setFilters({ ...next, page: 1 });
  };

  const ticketGridColumns = useMemo<ColumnDef<Ticket>[]>(
    () => [
      {
        accessorKey: 'protocol',
        header: 'Protocolo',
        cell: ({ row }) => (
          <Link
            to={`/tickets/${row.original.id}`}
            className="font-mono text-brand-600 hover:text-brand-800 hover:underline font-medium text-[12px]"
          >
            {row.original.protocol}
          </Link>
        ),
      },
      {
        accessorKey: 'title',
        header: 'Título',
        cell: ({ row }) => (
          <Link
            to={`/tickets/${row.original.id}`}
            className="text-gray-900 hover:text-brand-600 font-medium block truncate max-w-xs text-[12px]"
          >
            {row.original.title}
          </Link>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const status = row.original.status;
          return (
            <EzTag
              label={statusLabels[status] ?? status}
              variant={statusTagVariants[status]}
            />
          );
        },
      },
      {
        accessorKey: 'priority',
        header: 'Prioridade',
        cell: ({ row }) => {
          const priority = row.original.priority;
          return (
            <EzTag
              label={priorityLabels[priority] ?? priority}
              variant={priorityTagVariants[priority]}
            />
          );
        },
      },
      {
        accessorKey: 'serviceDeskId',
        header: 'Mesa / Fila',
        cell: ({ row }) => (
          <span className="text-gray-700 text-[12px] font-mono">
            {row.original.serviceDeskId}
          </span>
        ),
      },
      {
        accessorKey: 'agentId',
        header: 'Responsável',
        cell: ({ row }) => (
          <span className="text-gray-700 text-[12px]">
            {row.original.agentId ? (
              <span className="font-mono">{row.original.agentId}</span>
            ) : (
              <span className="text-gray-400 italic">Não atribuído</span>
            )}
          </span>
        ),
      },
      {
        accessorKey: 'resolveDeadline',
        header: 'SLA Resolução',
        cell: ({ row }) => {
          if (!row.original.resolveDeadline) {
            return <span className="text-gray-400 text-[12px]">—</span>;
          }
          const date = new Date(row.original.resolveDeadline);
          return (
            <span className="text-gray-600 text-[12px]">
              {date.toLocaleDateString('pt-BR')} {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          );
        },
      },
      {
        accessorKey: 'responseDeadline',
        header: 'SLA Resposta',
        cell: ({ row }) => {
          if (!row.original.responseDeadline) {
            return <span className="text-gray-400 text-[12px]">—</span>;
          }
          const date = new Date(row.original.responseDeadline);
          return (
            <span className="text-gray-600 text-[12px]">
              {date.toLocaleDateString('pt-BR')} {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          );
        },
      },
      {
        accessorKey: 'csatScore',
        header: 'CSAT',
        cell: ({ row }) => {
          const score = row.original.csatScore;
          if (score === null || score === undefined) {
            return <span className="text-gray-400 text-[12px]">—</span>;
          }
          return (
            <span className="text-amber-600 font-semibold text-[12px]">
              ★ {score}
            </span>
          );
        },
      },
      {
        accessorKey: 'parentTicketId',
        header: 'Chamado Pai',
        cell: ({ row }) => {
          const parent = row.original.parentTicket;
          const parentId = row.original.parentTicketId;
          if (!parentId && !parent) {
            return <span className="text-gray-400 text-[12px]">—</span>;
          }
          return (
            <Link
              to={`/tickets/${parent?.id ?? parentId}`}
              className="font-mono text-brand-600 hover:text-brand-800 hover:underline text-[12px]"
            >
              {parent?.protocol ?? parentId}
            </Link>
          );
        },
      },
      {
        accessorKey: 'createdAt',
        header: 'Criado em',
        cell: ({ row }) => {
          const date = new Date(row.original.createdAt);
          return (
            <span className="text-gray-600 text-[12px]">
              {date.toLocaleDateString('pt-BR')} {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          );
        },
      },
      {
        accessorKey: 'updatedAt',
        header: 'Atualizado em',
        cell: ({ row }) => {
          const date = new Date(row.original.updatedAt);
          return (
            <span className="text-gray-600 text-[12px]">
              {date.toLocaleDateString('pt-BR')} {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          );
        },
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[20px] font-semibold text-gray-900">
          {user?.role === 'CLIENT' ? 'Meus Chamados' : 'Caixa de Entrada'}
        </h1>
        {user?.role !== 'CLIENT' && (
          <div className="flex shrink-0 items-center justify-center rounded-[8px] border border-gray-200 bg-gray-90 p-1 text-sm">
            <button
              type="button"
              className={cn(
                'rounded-[6px] px-3 py-1 font-medium transition-colors',
                viewMode === 'list'
                  ? 'bg-white text-brand-600 shadow-sm border border-gray-200'
                  : 'text-gray-500 hover:text-gray-900 border border-transparent',
              )}
              onClick={() => setViewMode('list')}
            >
              Lista
            </button>
            <button
              type="button"
              className={cn(
                'rounded-[6px] px-3 py-1 font-medium transition-colors',
                viewMode === 'kanban'
                  ? 'bg-white text-brand-600 shadow-sm border border-gray-200'
                  : 'text-gray-500 hover:text-gray-900 border border-transparent',
              )}
              onClick={() => setViewMode('kanban')}
            >
              Kanban
            </button>
            <button
              type="button"
              data-testid="tickets-viewmode-grid"
              className={cn(
                'rounded-[6px] px-3 py-1 font-medium transition-colors',
                viewMode === 'grid'
                  ? 'bg-white text-brand-600 shadow-sm border border-gray-200'
                  : 'text-gray-500 hover:text-gray-900 border border-transparent',
              )}
              onClick={() => setViewMode('grid')}
            >
              Grade
            </button>
          </div>
        )}
      </div>

      <TicketFilters filters={filters} onChange={handleFiltersChange} />

      {isLoading ? (
        <div className="flex justify-center py-8">
          <EzSpinner label="Carregando chamados…" />
        </div>
      ) : isError ? (
        <EzAlert variant="error">
          Falha ao carregar os chamados. Tente novamente.
        </EzAlert>
      ) : viewMode === 'kanban' ? (
        <TicketKanban tickets={tickets} isLoading={isLoading} isError={isError} />
      ) : viewMode === 'grid' ? (
        <div className="bg-white rounded-[8px] border border-gray-200 overflow-hidden shadow-sm">
          <EzEntityGrid
            data={tickets}
            columns={ticketGridColumns}
            showRowNumbers
            selectable
            showStatusBar
            showGridCornerMenu
            enableColumnMenu
            enableColumnFilters
            zebraStriping
            density="compact"
            initialColumnVisibility={{
              updatedAt: false,
              responseDeadline: false,
              parentTicketId: false,
              csatScore: false,
            }}
            taskbarButtons={['INSERT', 'CLONE', 'REMOVE', 'DIVIDER', 'CONFIGURATOR']}
            onTaskbarAction={(action) => {
              if (action === 'INSERT') navigate('/tickets/new');
            }}
            pageSize={10}
            pageSizeOptions={[5, 10, 20, 50]}
          />
        </div>
      ) : (
        <>
          <TicketList tickets={tickets} isLoading={isLoading} isError={isError} />
          {meta && meta.totalPages > 1 && (
            <nav
              aria-label="Paginação de chamados"
              className="flex items-center justify-between pt-2 text-sm"
            >
              <span className="text-gray-500">
                Página {meta.page} de {meta.totalPages} ({meta.total}{' '}
                {meta.total === 1 ? 'chamado' : 'chamados'})
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() =>
                    setFilters((prev) => ({ ...prev, page: currentPage - 1 }))
                  }
                  className="rounded-[8px] border border-gray-200 px-3 py-1 text-gray-700 hover:bg-gray-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  disabled={currentPage >= meta.totalPages}
                  onClick={() =>
                    setFilters((prev) => ({ ...prev, page: currentPage + 1 }))
                  }
                  className="rounded-[8px] border border-gray-200 px-3 py-1 text-gray-700 hover:bg-gray-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Próxima
                </button>
              </div>
            </nav>
          )}
        </>
      )}
    </div>
  );
}

export default TicketsPage;
