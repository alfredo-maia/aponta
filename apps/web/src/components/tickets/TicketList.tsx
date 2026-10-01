import type { Ticket } from '../../hooks/useTickets';
import { TicketCard } from './TicketCard';

interface TicketListProps {
  tickets: Ticket[];
  isLoading: boolean;
  isError: boolean;
}

export function TicketList({ tickets, isLoading, isError }: TicketListProps) {
  if (isLoading) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Carregando chamados…
      </p>
    );
  }

  if (isError) {
    return (
      <p role="alert" className="text-sm text-red-600">
        Falha ao carregar os chamados. Tente novamente.
      </p>
    );
  }

  if ((tickets.data || []).length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum chamado encontrado. Tente ajustar os filtros.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {(tickets.data || []).map((ticket) => (
        <TicketCard key={ticket.id} ticket={ticket} />
      ))}
    </ul>
  );
}

export default TicketList;
