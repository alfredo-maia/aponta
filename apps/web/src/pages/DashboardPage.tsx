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

      <TicketFilters filters={filters} onChange={setFilters} />
      
      {viewMode === 'kanban' ? (
        <TicketKanban
          tickets={data ?? []}
          isLoading={isLoading}
          isError={isError}
        />
      ) : (
        <TicketList
          tickets={data ?? []}
          isLoading={isLoading}
          isError={isError}
        />
      )}
    </div>
  );
}

export default DashboardPage;
