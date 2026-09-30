import { useState } from 'react';
import { TicketFilters } from '../components/tickets/TicketFilters';
import { TicketList } from '../components/tickets/TicketList';
import type { TicketFiltersInput } from '../hooks/useTickets';
import { useTickets } from '../hooks/useTickets';

export function DashboardPage() {
  const [filters, setFilters] = useState<TicketFiltersInput>({});
  const { data, isLoading, isError } = useTickets(filters);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Chamados</h1>
      <TicketFilters filters={filters} onChange={setFilters} />
      <TicketList
        tickets={data ?? []}
        isLoading={isLoading}
        isError={isError}
      />
    </div>
  );
}

export default DashboardPage;
