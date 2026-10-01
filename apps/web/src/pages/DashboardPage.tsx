import { useState, useEffect } from 'react';
import { TicketFilters } from '../components/tickets/TicketFilters';
import { TicketList } from '../components/tickets/TicketList';
import { TicketKanban } from '../components/tickets/TicketKanban';
import type { TicketFiltersInput } from '../hooks/useTickets';
import { useTickets } from '../hooks/useTickets';
import { useAuthStore } from '../stores/authStore';

type ViewMode = 'list' | 'kanban';

export function DashboardPage() {
  const [filters, setFilters] = useState<TicketFiltersInput>({});
  const { data, isLoading, isError } = useTickets(filters);
  const user = useAuthStore((state) => state.user);

  // Agentes default to Kanban, Clients forcefully use list
  const [viewMode, setViewMode] = useState<ViewMode>(user?.role === 'CLIENT' ? 'list' : 'kanban');

  // Sync Se client, trava em list 
  useEffect(() => {
    if (user?.role === 'CLIENT') {
      setViewMode('list');
    }
  }, [user?.role]);

  const tickets = data?.data ?? [];
  const meta = data?.meta;
  const currentPage = filters.page ?? 1;

  const handleFiltersChange = (next: TicketFiltersInput) => {
    // Any filter/search change resets back to page 1 so results aren't
    // scoped to a page number that may no longer exist under the new query.
    setFilters({ ...next, page: 1 });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {user?.role === 'CLIENT' ? 'Meus Chamados' : 'Caixa de Entrada'}
        </h1>
        {user?.role !== 'CLIENT' && (
          <div className="flex shrink-0 items-center justify-center rounded-lg border bg-muted/50 p-1 text-sm">
            <button
              className={`rounded-md px-3 py-1 font-medium transition-colors ${
                viewMode === 'list' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setViewMode('list')}
            >
              Lista
            </button>
            <button
              className={`rounded-md px-3 py-1 font-medium transition-colors ${
                viewMode === 'kanban' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setViewMode('kanban')}
            >
              Kanban
            </button>
          </div>
        )}
      </div>

      <TicketFilters filters={filters} onChange={handleFiltersChange} />

      {viewMode === 'kanban' ? (
        <TicketKanban
          tickets={tickets}
          isLoading={isLoading}
          isError={isError}
        />
      ) : (
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
              <span className="text-muted-foreground">
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
                  className="rounded border px-3 py-1 disabled:opacity-50"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  disabled={currentPage >= meta.totalPages}
                  onClick={() =>
                    setFilters((prev) => ({ ...prev, page: currentPage + 1 }))
                  }
                  className="rounded border px-3 py-1 disabled:opacity-50"
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

export default DashboardPage;
