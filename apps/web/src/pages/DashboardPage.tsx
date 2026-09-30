import { useState } from 'react';
import { TicketFilters } from '../components/tickets/TicketFilters';
import { TicketList } from '../components/tickets/TicketList';
import type { TicketFiltersInput } from '../hooks/useTickets';
import { useTickets } from '../hooks/useTickets';
import { useAuthStore } from '../stores/authStore';

export function DashboardPage() {
  const [filters, setFilters] = useState<TicketFiltersInput>({});
  const { data, isLoading, isError } = useTickets(filters);
  const user = useAuthStore((state) => state.user);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        {user?.role === 'CLIENT' ? 'Meus Chamados' : 'Caixa de Entrada'}
      </h1>
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
