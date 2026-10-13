import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { api } from '../../lib/api';
import { useTickets, Ticket } from '../../hooks/useTickets';
import { EzModal, EzTextInput, EzSpinner, EzTag } from '../ds';
import { statusLabels, statusTagVariants } from '../tickets/TicketCard';

interface PickerOption {
  id: string;
  name: string;
}

interface TicketSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (ticket: Ticket) => void;
  /** Hidden for CLIENT_MASTER: tenant scoping already limits results to their own org. */
  showOrganizationFilter?: boolean;
}

/**
 * Full search modal for linking a ticket to an Agenda appointment: free-text
 * search plus Cliente/Mesa filters, scoped server-side to tickets that are
 * not yet RESOLVED/CLOSED (DMTE-18 review feedback).
 */
export function TicketSearchModal({
  isOpen,
  onClose,
  onSelect,
  showOrganizationFilter = true,
}: TicketSearchModalProps) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [organizationId, setOrganizationId] = useState('');
  const [serviceDeskId, setServiceDeskId] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setSearch('');
      setDebouncedSearch('');
      setOrganizationId('');
      setServiceDeskId('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(handle);
  }, [search]);

  const organizationsQuery = useQuery({
    queryKey: ['organizations', 'ticket-picker'],
    queryFn: async () => {
      const { data } = await api.get<PickerOption[]>('/organizations');
      return data;
    },
    enabled: isOpen && showOrganizationFilter,
  });

  const serviceDesksQuery = useQuery({
    queryKey: ['service-desks', 'ticket-picker'],
    queryFn: async () => {
      const { data } = await api.get<PickerOption[]>('/service-desks');
      return data;
    },
    enabled: isOpen,
  });

  const ticketsQuery = useTickets({
    search: debouncedSearch || undefined,
    organizationId: organizationId || undefined,
    serviceDeskId: serviceDeskId || undefined,
    notClosed: true,
    page: 1,
  });

  const tickets = ticketsQuery.data?.data ?? [];

  return (
    <EzModal isOpen={isOpen} onClose={onClose} title="Buscar Chamado" maxWidth="lg">
      <div className="flex flex-col gap-3 py-2">
        <EzTextInput
          placeholder="Buscar por protocolo, título ou descrição..."
          leftIcon={<Search className="w-4 h-4" />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {showOrganizationFilter && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Cliente</label>
              <select
                aria-label="Filtrar por cliente"
                value={organizationId}
                onChange={(e) => setOrganizationId(e.target.value)}
                className="w-full h-[38px] px-3 text-sm border border-gray-300 rounded-[8px] bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">Todos os clientes</option>
                {(Array.isArray(organizationsQuery.data) ? organizationsQuery.data : []).map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Mesa</label>
            <select
              aria-label="Filtrar por mesa"
              value={serviceDeskId}
              onChange={(e) => setServiceDeskId(e.target.value)}
              className="w-full h-[38px] px-3 text-sm border border-gray-300 rounded-[8px] bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Todas as mesas</option>
              {(Array.isArray(serviceDesksQuery.data) ? serviceDesksQuery.data : []).map((sd) => (
                <option key={sd.id} value={sd.id}>
                  {sd.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="border border-gray-200 rounded-[8px] max-h-80 overflow-y-auto divide-y divide-gray-100">
          {ticketsQuery.isLoading ? (
            <div className="flex items-center justify-center p-6">
              <EzSpinner size={24} />
            </div>
          ) : tickets.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-400">
              Nenhum chamado não fechado encontrado com esses filtros.
            </div>
          ) : (
            tickets.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onSelect(t)}
                className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <span className="text-xs font-bold text-brand-600">#{t.protocol}</span>
                  <p className="text-sm text-gray-900 truncate">{t.title}</p>
                </div>
                <EzTag label={statusLabels[t.status]} variant={statusTagVariants[t.status]} />
              </button>
            ))
          )}
        </div>
      </div>
    </EzModal>
  );
}
