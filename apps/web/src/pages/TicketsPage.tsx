import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TicketList } from '../components/tickets/TicketList';
import { TicketKanban } from '../components/tickets/TicketKanban';
import { TicketsHeader, type TicketsViewMode } from '../components/tickets/TicketsHeader';
import { EzAlert, EzSpinner } from '../components/ds';
import type { TicketFiltersInput } from '../hooks/useTickets';
import { useTickets } from '../hooks/useTickets';
import { useAuthStore } from '../stores/authStore';
import { useOpenInTab } from '../contexts/TabsContext';
import {
  filtersToSearchParams,
  parseFiltersFromSearchParams,
} from '../lib/ticketFilterParams';

export function TicketsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<TicketFiltersInput>(() =>
    parseFiltersFromSearchParams(searchParams),
  );
  const { data, isLoading, isError } = useTickets(filters);
  const user = useAuthStore((state) => state.user);
  const isClient = user?.role === 'CLIENT';
  const openInTab = useOpenInTab();

  // One-way sync: filters state -> URL, so every change the user makes via
  // Busca avançada/pagination stays reflected in a shareable, bookmarkable
  // URL and survives a back-button navigation. `replace` avoids piling up
  // a history entry per filter tweak.
  useEffect(() => {
    setSearchParams(filtersToSearchParams(filters), { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // Agentes default to Kanban, Clientes default to Lista; modo fica na URL
  // (?view=list|kanban, D3) para ser bookmarkable como os filtros.
  const [viewMode, setViewMode] = useState<TicketsViewMode>(() => {
    const fromUrl = searchParams.get('view');
    if (fromUrl === 'list' || fromUrl === 'kanban') return fromUrl;
    return isClient ? 'list' : 'kanban';
  });

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (params.get('view') !== viewMode) {
      params.set('view', viewMode);
      setSearchParams(params, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode]);

  // Sync: se client, trava em list
  useEffect(() => {
    if (isClient && viewMode === 'kanban') {
      setViewMode('list');
    }
  }, [isClient, viewMode]);

  const tickets = data?.data ?? [];
  const meta = data?.meta;
  const currentPage = filters.page ?? 1;

  return (
    <div className="space-y-4">
      <TicketsHeader
        isClient={isClient}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        search={filters.search ?? ''}
        onSearchChange={(search) =>
          setFilters((prev) => ({ ...prev, search: search || undefined, page: 1 }))
        }
        onOpenAdvancedSearch={() => openInTab('/tickets/search', 'Busca avançada')}
      />

      {isLoading ? (
        <div className="flex justify-center py-8">
          <EzSpinner label="Carregando chamados…" />
        </div>
      ) : isError ? (
        <EzAlert variant="error">
          Falha ao carregar os chamados. Tente novamente.
        </EzAlert>
      ) : viewMode === 'kanban' ? (
        <TicketKanban
          tickets={tickets}
          isLoading={isLoading}
          isError={isError}
          initialServiceDeskId={filters.serviceDeskId}
        />
      ) : (
        /* ================= LIST VIEW (MODO LISTA) ================= */
        <>
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
