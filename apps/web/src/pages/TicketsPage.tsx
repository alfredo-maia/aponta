import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { TicketFilters } from '../components/tickets/TicketFilters';
import { TicketList } from '../components/tickets/TicketList';
import { TicketKanban } from '../components/tickets/TicketKanban';
import { TicketFormMode } from '../components/tickets/TicketFormMode';
import {
  statusLabels,
  priorityLabels,
  statusTagVariants,
  priorityTagVariants,
} from '../components/tickets/TicketCard';
import {
  EzEntityGrid,
  EzEntityToolbar,
  EzEntityScreenConfigModal,
  EzFilterDrawer,
  EzTag,
  EzAlert,
  EzSpinner,
} from '../components/ds';
import type { Ticket, TicketFiltersInput } from '../hooks/useTickets';
import { useTickets } from '../hooks/useTickets';
import { useAuthStore } from '../stores/authStore';
import { useUserScreenConfig } from '../hooks/useUserScreenConfig';
import { cn } from '../components/ds/utils';

type ViewMode = 'list' | 'kanban' | 'grid';

/**
 * Reads the initial `TicketFiltersInput` from the URL so a link like
 * `/tickets?mine=true` or `/tickets?overdue=true` (e.g. from the dashboard's
 * "Resumo de tickets" KPIs) pre-filters the list on load.
 */
function parseFiltersFromSearchParams(params: URLSearchParams): TicketFiltersInput {
  const filters: TicketFiltersInput = {};
  const serviceDeskId = params.get('serviceDeskId');
  if (serviceDeskId) filters.serviceDeskId = serviceDeskId;
  const status = params.get('status');
  if (status) filters.status = status as TicketFiltersInput['status'];
  const search = params.get('search');
  if (search) filters.search = search;
  const page = Number(params.get('page'));
  if (Number.isFinite(page) && page > 1) filters.page = page;
  if (params.get('mine') === 'true') filters.mine = true;
  if (params.get('unassigned') === 'true') filters.unassigned = true;
  if (params.get('paused') === 'true') filters.paused = true;
  if (params.get('overdue') === 'true') filters.overdue = true;
  return filters;
}

/** Inverse of `parseFiltersFromSearchParams` — keeps the URL bookmarkable/shareable. */
function filtersToSearchParams(filters: TicketFiltersInput): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.serviceDeskId) params.set('serviceDeskId', filters.serviceDeskId);
  if (filters.status) params.set('status', filters.status);
  if (filters.search) params.set('search', filters.search);
  if (filters.page && filters.page > 1) params.set('page', String(filters.page));
  if (filters.mine) params.set('mine', 'true');
  if (filters.unassigned) params.set('unassigned', 'true');
  if (filters.paused) params.set('paused', 'true');
  if (filters.overdue) params.set('overdue', 'true');
  return params;
}

export function TicketsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<TicketFiltersInput>(() =>
    parseFiltersFromSearchParams(searchParams),
  );
  const { data, isLoading, isError, refetch } = useTickets(filters);
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();

  // One-way sync: filters state -> URL, so every change the user makes via
  // TicketFilters/pagination/clearing stays reflected in a shareable,
  // bookmarkable URL and survives a back-button navigation. `replace` avoids
  // piling up a history entry per keystroke/filter tweak.
  useEffect(() => {
    setSearchParams(filtersToSearchParams(filters), { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // Agentes default to Kanban, Clients default to list
  const [viewMode, setViewMode] = useState<ViewMode>(user?.role === 'CLIENT' ? 'list' : 'kanban');

  // Per-user screen personalization for grid columns, density, and form layout
  const {
    config: screenConfig,
    setColumnVisibility,
    setDensity,
    setFormLayout,
    setViewMode: setConfigViewMode,
    restoreDefaults,
  } = useUserScreenConfig('tickets', {
    grid: {
      columnVisibility: {
        updatedAt: false,
        responseDeadline: false,
        parentTicketId: false,
        csatScore: false,
      },
      density: 'compact',
    },
    form: {
      layout: 'CASCADE',
    },
    viewMode: 'GRID',
  });

  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [isScreenConfigModalOpen, setIsScreenConfigModalOpen] = useState(false);
  const [screenConfigInitialTab, setScreenConfigInitialTab] = useState<'grid' | 'form'>('grid');
  const [selectedTickets, setSelectedTickets] = useState<Ticket[]>([]);
  const [focusedIndex, setFocusedIndex] = useState(0);

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
        header: 'Mesa',
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

  // TiFlux parity: the grid view comes grouped by Estágio (status) by
  // default, with per-group counters, so users don't need to configure
  // grouping manually first. Memoized so the array identity stays stable
  // across re-renders — EzEntityGrid re-syncs its internal grouping state
  // whenever this prop's reference changes, which would otherwise clobber
  // a manual regroup the user made via its corner menu on every parent
  // re-render.
  const defaultTicketGroupBy = useMemo(() => ['status'], []);

  const screenConfigColumns = useMemo(() => {
    return ticketGridColumns.map((c) => {
      const colId = (c as any).accessorKey ?? c.id ?? '';
      const label = typeof c.header === 'string' ? c.header : colId;
      const isVisible = screenConfig.grid.columnVisibility[colId] !== false;
      return { id: colId, label, isVisible };
    });
  }, [ticketGridColumns, screenConfig.grid.columnVisibility]);

  const activeTicket = selectedTickets[0] ?? tickets[focusedIndex] ?? tickets[0];

  const handlePrevious = () => {
    if (screenConfig.viewMode === 'FORM') {
      if (focusedIndex > 0) {
        setFocusedIndex((prev) => prev - 1);
        setSelectedTickets([tickets[focusedIndex - 1]]);
      } else if (currentPage > 1) {
        setFilters((prev) => ({ ...prev, page: currentPage - 1 }));
        setFocusedIndex(tickets.length - 1);
      }
    } else {
      if (currentPage > 1) {
        setFilters((prev) => ({ ...prev, page: currentPage - 1 }));
      }
    }
  };

  const handleNext = () => {
    if (screenConfig.viewMode === 'FORM') {
      if (focusedIndex < tickets.length - 1) {
        setFocusedIndex((prev) => prev + 1);
        setSelectedTickets([tickets[focusedIndex + 1]]);
      } else if (meta && currentPage < meta.totalPages) {
        setFilters((prev) => ({ ...prev, page: currentPage + 1 }));
        setFocusedIndex(0);
      }
    } else {
      if (meta && currentPage < meta.totalPages) {
        setFilters((prev) => ({ ...prev, page: currentPage + 1 }));
      }
    }
  };

  const handleDelete = () => {
    if (selectedTickets.length === 0) return;
    const confirmMsg = `Deseja excluir ${selectedTickets.length} chamado(s) selecionado(s)?`;
    if (window.confirm(confirmMsg)) {
      setSelectedTickets([]);
      void refetch();
    }
  };

  const handleClone = () => {
    if (!activeTicket) return;
    navigate('/tickets/new', { state: { cloneFrom: activeTicket } });
  };

  const recordStart = meta ? (currentPage - 1) * meta.limit + 1 : 1;
  const recordEnd = meta ? Math.min(currentPage * meta.limit, meta.total) : tickets.length;
  const totalCount = meta ? meta.total : tickets.length;
  const recordCountText = `${totalCount === 0 ? 0 : recordStart} - ${recordEnd} de ${totalCount}`;

  return (
    <div className="space-y-4">
      {/* Header with Title and Mode Switcher */}
      <div className="flex items-center justify-between">
        <h1 className="text-[20px] font-semibold text-gray-900">
          {user?.role === 'CLIENT' ? 'Meus Chamados' : 'Caixa de Entrada'}
        </h1>
        {user?.role !== 'CLIENT' && (
          <div className="flex shrink-0 items-center justify-center rounded-[8px] border border-gray-200 bg-gray-90 p-1 text-sm">
            <button
              type="button"
              className={cn(
                'rounded-[6px] px-3 py-1 font-medium transition-colors cursor-pointer',
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
                'rounded-[6px] px-3 py-1 font-medium transition-colors cursor-pointer',
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
                'rounded-[6px] px-3 py-1 font-medium transition-colors cursor-pointer',
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

      {isLoading ? (
        <div className="flex justify-center py-8">
          <EzSpinner label="Carregando chamados…" />
        </div>
      ) : isError ? (
        <EzAlert variant="error">
          Falha ao carregar os chamados. Tente novamente.
        </EzAlert>
      ) : viewMode === 'kanban' ? (
        <>
          <TicketFilters filters={filters} onChange={handleFiltersChange} />
          <TicketKanban
            tickets={tickets}
            isLoading={isLoading}
            isError={isError}
            serviceDeskId={filters.serviceDeskId}
          />
        </>
      ) : viewMode === 'grid' ? (
        /* ================= SANKHYA ENTITY CONTAINER (PADRÃO DE CADASTRO) ================= */
        <div className="bg-white rounded-[10px] border border-gray-200 overflow-hidden shadow-xs flex flex-col">
          {/* Sankhya Standard Entity Toolbar */}
          <EzEntityToolbar
            viewMode={screenConfig.viewMode}
            onToggleViewMode={(mode) => setConfigViewMode(mode)}
            isFilterOpen={isFilterPanelOpen}
            onToggleFilter={() => setIsFilterPanelOpen((prev) => !prev)}
            onInsert={() => navigate('/tickets/new')}
            hasPrevious={screenConfig.viewMode === 'FORM' ? focusedIndex > 0 || currentPage > 1 : currentPage > 1}
            onPrevious={handlePrevious}
            hasNext={screenConfig.viewMode === 'FORM' ? focusedIndex < tickets.length - 1 || (meta ? currentPage < meta.totalPages : false) : (meta ? currentPage < meta.totalPages : false)}
            onNext={handleNext}
            selectedCount={selectedTickets.length}
            onDelete={handleDelete}
            onClone={handleClone}
            onRefresh={() => void refetch()}
            onOpenGridConfig={() => {
              setScreenConfigInitialTab('grid');
              setIsScreenConfigModalOpen(true);
            }}
            onOpenFormConfig={() => {
              setScreenConfigInitialTab('form');
              setIsScreenConfigModalOpen(true);
            }}
            onOpenScreenConfig={() => {
              setScreenConfigInitialTab('grid');
              setIsScreenConfigModalOpen(true);
            }}
            onOpenAttachments={() => {
              if (activeTicket) navigate(`/tickets/${activeTicket.id}`);
            }}
            recordCountText={recordCountText}
            actions={[
              {
                label: 'Atualizar Fila',
                onClick: () => void refetch(),
              },
              {
                label: 'Exportar Lista (CSV)',
                onClick: () => {
                  const headers = 'Protocolo,Título,Status,Prioridade,Criado Em\n';
                  const rows = tickets.map((t) => `${t.protocol},"${t.title}",${t.status},${t.priority},${t.createdAt}`).join('\n');
                  const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'chamados.csv';
                  a.click();
                },
              },
            ]}
          />

          {/* Main Content Area with Collapsible Filter Drawer */}
          <div className="flex w-full min-h-[500px]">
            {/* Sankhya Collapsible Filter Drawer */}
            <EzFilterDrawer
              isOpen={isFilterPanelOpen}
              onClose={() => setIsFilterPanelOpen(false)}
              onClear={() => setFilters({})}
              title="Filtros de Chamados"
            >
              <TicketFilters filters={filters} onChange={handleFiltersChange} />
            </EzFilterDrawer>

            {/* Grid or Form Content */}
            <div className="flex-1 p-3 overflow-x-auto min-w-0">
              {screenConfig.viewMode === 'GRID' ? (
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
                  groupBy={defaultTicketGroupBy}
                  density={screenConfig.grid.density}
                  initialColumnVisibility={screenConfig.grid.columnVisibility}
                  onSelectionChange={(selected) => {
                    setSelectedTickets(selected);
                    if (selected.length > 0) {
                      const idx = tickets.findIndex((t) => t.id === selected[0].id);
                      if (idx !== -1) setFocusedIndex(idx);
                    }
                  }}
                  pageSize={10}
                  pageSizeOptions={[5, 10, 20, 50]}
                />
              ) : activeTicket ? (
                <TicketFormMode
                  ticket={activeTicket}
                  layout={screenConfig.form.layout}
                  onBackToGrid={() => setConfigViewMode('GRID')}
                  onSave={async () => {
                    await refetch();
                    setConfigViewMode('GRID');
                  }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-12 text-center text-gray-500">
                  <p className="text-[14px]">Nenhum chamado selecionado para exibição no formulário.</p>
                  <button
                    type="button"
                    onClick={() => setConfigViewMode('GRID')}
                    className="mt-3 px-3 py-1.5 text-[12px] font-medium text-brand-600 hover:text-brand-700 bg-brand-50 rounded-[6px]"
                  >
                    Voltar à Grade
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Fallback filter bar when filter drawer is closed, ensuring accessibility */}
          {!isFilterPanelOpen && (
            <div className="px-3 pb-3 border-t border-gray-100 pt-2 bg-gray-50/50">
              <TicketFilters filters={filters} onChange={handleFiltersChange} />
            </div>
          )}
        </div>
      ) : (
        /* ================= LIST VIEW (MODO LISTA) ================= */
        <>
          <TicketFilters filters={filters} onChange={handleFiltersChange} />
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

      {/* Per-User Screen Configuration Modal */}
      {isScreenConfigModalOpen && (
        <EzEntityScreenConfigModal
          columns={screenConfigColumns}
          onToggleColumn={(colId) => {
            setColumnVisibility((prev) => ({
              ...prev,
              [colId]: prev[colId] === false ? true : false,
            }));
          }}
          density={screenConfig.grid.density}
          onDensityChange={setDensity}
          formLayout={screenConfig.form.layout}
          onFormLayoutChange={setFormLayout}
          onRestoreDefaults={restoreDefaults}
          onClose={() => setIsScreenConfigModalOpen(false)}
          initialTab={screenConfigInitialTab}
        />
      )}
    </div>
  );
}

export default TicketsPage;
