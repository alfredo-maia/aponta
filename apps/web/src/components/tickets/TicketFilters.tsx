import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { TicketStatus, TicketFiltersInput } from '../../hooks/useTickets';
import { statusLabels } from './TicketCard';
import { api } from '../../lib/api';
import { EzComboBox, EzTextInput } from '../ds';

interface ServiceDesk {
  id: string;
  name: string;
}

const ticketStatuses = Object.keys(statusLabels) as TicketStatus[];

interface TicketFiltersProps {
  filters: TicketFiltersInput;
  onChange: (filters: TicketFiltersInput) => void;
}

export function TicketFilters({ filters, onChange }: TicketFiltersProps) {
  const { data: serviceDesks } = useQuery({
    queryKey: ['service-desks'],
    queryFn: async () => {
      const { data } = await api.get<ServiceDesk[]>('/service-desks');
      return data;
    },
  });

  // Local, debounced search text: typing shouldn't fire a request per
  // keystroke. Kept in sync if the parent resets filters (e.g. clearing).
  const [searchText, setSearchText] = useState(filters.search ?? '');

  useEffect(() => {
    setSearchText(filters.search ?? '');
  }, [filters.search]);

  useEffect(() => {
    const handle = setTimeout(() => {
      if ((filters.search ?? '') !== searchText) {
        onChange({ ...filters, search: searchText || undefined });
      }
    }, 400);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  return (
    <div className="flex flex-wrap items-end gap-4">
      <EzTextInput
        id="filter-search"
        label="Buscar"
        type="search"
        placeholder="Título, protocolo ou descrição…"
        value={searchText}
        onChange={(event) => setSearchText(event.target.value)}
      />

      <EzComboBox
        id="filter-service-desk"
        label="Departamento"
        value={filters.serviceDeskId ?? ''}
        onChange={(event) =>
          onChange({
            ...filters,
            serviceDeskId: event.target.value || undefined,
          })
        }
      >
        <option value="">Todos os departamentos</option>
        {(serviceDesks ?? []).map((desk) => (
          <option key={desk.id} value={desk.id}>
            {desk.name}
          </option>
        ))}
      </EzComboBox>

      <EzComboBox
        id="filter-status"
        label="Status"
        value={filters.status ?? ''}
        onChange={(event) =>
          onChange({
            ...filters,
            status: (event.target.value || undefined) as
              | TicketStatus
              | undefined,
          })
        }
      >
        <option value="">Todos os status</option>
        {ticketStatuses.map((status) => (
          <option key={status} value={status}>
            {statusLabels[status]}
          </option>
        ))}
      </EzComboBox>
    </div>
  );
}

export default TicketFilters;
