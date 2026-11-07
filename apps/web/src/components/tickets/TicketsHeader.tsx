import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { EzSegmented } from '../ds';

export type TicketsViewMode = 'list' | 'kanban';

interface TicketsHeaderProps {
  isClient: boolean;
  viewMode: TicketsViewMode;
  onViewModeChange: (mode: TicketsViewMode) => void;
  search: string;
  onSearchChange: (search: string) => void;
  onOpenAdvancedSearch: () => void;
}

/**
 * Cabeçalho do painel de Tickets (SPEC DMTE-137 D3): esquerda "Tickets" +
 * alternância Lista/Kanban (oculta para CLIENT, que não tem Kanban);
 * direita campo Buscar (texto livre, debounced) + botão Busca avançada.
 */
export function TicketsHeader({
  isClient,
  viewMode,
  onViewModeChange,
  search,
  onSearchChange,
  onOpenAdvancedSearch,
}: TicketsHeaderProps) {
  const [searchText, setSearchText] = useState(search);

  useEffect(() => {
    setSearchText(search);
  }, [search]);

  useEffect(() => {
    const handle = setTimeout(() => {
      if (searchText !== search) {
        onSearchChange(searchText);
      }
    }, 400);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex shrink-0 items-center gap-4">
        <h1 className="text-[20px] font-semibold text-gray-900">Tickets</h1>
        {!isClient && (
          <EzSegmented
            aria-label="Visualização"
            value={viewMode}
            onChange={onViewModeChange}
            options={[
              { value: 'list', label: 'Lista' },
              { value: 'kanban', label: 'Kanban' },
            ]}
          />
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <label htmlFor="tickets-header-search" className="sr-only">
            Buscar
          </label>
          <input
            id="tickets-header-search"
            type="search"
            placeholder="Buscar…"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            className="h-[var(--control-height-md)] w-56 rounded-control border border-gray-200 bg-white pl-8 pr-3 text-[13px] text-gray-900 placeholder:text-gray-400 focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
          />
        </div>
        <button
          type="button"
          onClick={onOpenAdvancedSearch}
          className="h-[var(--control-height-md)] shrink-0 rounded-control border border-gray-200 bg-white px-3 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-90"
        >
          Busca avançada
        </button>
      </div>
    </div>
  );
}

export default TicketsHeader;
