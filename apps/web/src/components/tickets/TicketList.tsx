import type { Ticket } from '../../hooks/useTickets';
import { TicketCard } from './TicketCard';
import { EzAlert, EzEmptyCard, EzSpinner } from '../ds';

interface TicketListProps {
  tickets: Ticket[];
  isLoading: boolean;
  isError: boolean;
}

export function TicketList({ tickets, isLoading, isError }: TicketListProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <EzSpinner label="Carregando chamados…" />
      </div>
    );
  }

  if (isError) {
    return (
      <EzAlert variant="error">
        Falha ao carregar os chamados. Tente novamente.
      </EzAlert>
    );
  }

  if (tickets.length === 0) {
    return (
      <EzEmptyCard
        title="Nenhum chamado encontrado"
        description="Tente ajustar os filtros."
      />
    );
  }

  return (
    <ul className="space-y-3">
      {tickets.map((ticket) => (
        <TicketCard key={ticket.id} ticket={ticket} />
      ))}
    </ul>
  );
}

export default TicketList;
