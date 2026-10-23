import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TicketFilters } from '../components/tickets/TicketFilters';
import { TicketList } from '../components/tickets/TicketList';
import { TicketKanban } from '../components/tickets/TicketKanban';
import { EzAlert, EzSpinner } from '../components/ds';
import type { TicketFiltersInput } from '../hooks/useTickets';
import { useTickets } from '../hooks/useTickets';
import { useAuthStore } from '../stores/authStore';
import { cn } from '../components/ds/utils';

type ViewMode = 'list' | 'kanban';

/**
 * Reads the initial `TicketFiltersInput` from the URL so a link like
 * `/tickets?mine=true` or `/tickets?overdue=true` (e.g. from the dashboard's
 * "Resumo de tickets" KPIs) pre-filters the list on load.
 */
function parseFiltersFromSearchParams(
  params: URLSearchParams,
): TicketFiltersInput {
  const filters: TicketFiltersInput = {};
  const serviceDeskId = params.get('serviceDeskId');
  if (serviceDeskId) filters.serviceDeskId = serviceDeskId;
  const status = params.get('status');
  if (status) filters.status = status as TicketFiltersInput['status'];
  const priority = params.get('priority');
  if (priority) filters.priority = priority as TicketFiltersInput['priority'];
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
  if (filters.priority) params.set('priority', filters.priority);
  if (filters.search) params.set('search', filters.search);
  if (filters.page && filters.page > 1)
    params.set('page', String(filters.page));
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
  const { data, isLoading, isError } = useTickets(filters);
  const user = useAuthStore((state) => state.user);

  // One-way sync: filters state -> URL, so every change the user makes via
  // TicketFilters/pagination/clearing stays reflected in a shareable,
  // bookmarkable URL and survives a back-button navigation. `replace` avoids
  // piling up a history entry per keystroke/filter tweak.
  useEffect(() => {
    setSearchParams(filtersToSearchParams(filters), { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // Agentes default to Kanban, Clients default to list
  const [viewMode, setViewMode] = useState<ViewMode>(
    user?.role === 'CLIENT' ? 'list' : 'kanban',
  );

  // Sync: se client, trava em list
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
            initialServiceDeskId={filters.serviceDeskId}
          />
        </>
      ) : (
        /* ================= LIST VIEW (MODO LISTA) ================= */
        <>
          <TicketFilters filters={filters} onChange={handleFiltersChange} />
          <TicketList
            tickets={tickets}
            isLoading={isLoading}
            isError={isError}
          />
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
