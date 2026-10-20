import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type {
  TicketPriority,
  TicketStatus,
  TicketFiltersInput,
} from '../../hooks/useTickets';
import { statusLabels, priorityLabels } from './TicketCard';
import { api } from '../../lib/api';
import { EzComboBox, EzTextInput } from '../ds';
import { cn } from '../ds/utils';

interface ServiceDesk {
  id: string;
  name: string;
}

const ticketStatuses = Object.keys(statusLabels) as TicketStatus[];
const ticketPriorities = Object.keys(priorityLabels) as TicketPriority[];

/**
 * Quick-filter presets (TiFlux "Padrões" parity): each toggles one boolean
 * flag already supported end-to-end by `TicketFiltersInput`/the API — until
 * now only reachable via a Dashboard KPI link (`?mine=true` etc.), never
 * exposed as a control on the Tickets screen itself.
 */
const quickFilters: {
  key: 'mine' | 'unassigned' | 'paused' | 'overdue';
  label: string;
}[] = [
  { key: 'mine', label: 'Meus' },
  { key: 'unassigned', label: 'Não atendidos' },
  { key: 'paused', label: 'Pausados' },
  { key: 'overdue', label: 'Vencidos' },
];

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
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {quickFilters.map(({ key, label }) => {
          const active = Boolean(filters[key]);
          return (
            <button
              key={key}
              type="button"
              data-testid={`quick-filter-${key}`}
              aria-pressed={active}
              onClick={() =>
                onChange({
                  ...filters,
                  [key]: active ? undefined : true,
                })
              }
              className={cn(
                'rounded-[24px] px-3 py-1 text-[12px] font-medium border transition-colors cursor-pointer',
                active
                  ? 'bg-brand-100/50 text-brand-700 border-brand-200'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-90',
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

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
                TicketStatus | undefined,
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

        <EzComboBox
          id="filter-priority"
          label="Prioridade"
          value={filters.priority ?? ''}
          onChange={(event) =>
            onChange({
              ...filters,
              priority: (event.target.value || undefined) as
                TicketPriority | undefined,
            })
          }
        >
          <option value="">Todas as prioridades</option>
          {ticketPriorities.map((priority) => (
            <option key={priority} value={priority}>
              {priorityLabels[priority]}
            </option>
          ))}
        </EzComboBox>
      </div>
    </div>
  );
}

export default TicketFilters;
