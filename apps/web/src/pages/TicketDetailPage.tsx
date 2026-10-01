import { useParams } from 'react-router-dom';
import { CommentForm } from '../components/tickets/CommentForm';
import { TicketComments } from '../components/tickets/TicketComments';
import { TicketDetail } from '../components/tickets/TicketDetail';
import { TicketAttachments } from '../components/tickets/TicketAttachments';
import { TicketCsat } from '../components/tickets/TicketCsat';
import { useTicket } from '../hooks/useTicket';
import { useAuthStore } from '../stores/authStore';

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: ticket, isLoading, isError } = useTicket(id);
  const user = useAuthStore((state) => state.user);

  if (isLoading) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Carregando chamado…
      </p>
    );
  }

  // The API returns 404 both for unknown ids and for tickets a CLIENT does
  // not own, so the error copy covers both cases without distinguishing them.
  if (isError || !ticket) {
    return (
      <p role="alert" className="text-sm text-red-600">
        Falha ao carregar o chamado. Ele pode não existir ou você pode não
        ter acesso a ele.
      </p>
    );
  }

  const isClient = user?.role === 'CLIENT';

  return (
    <div className="space-y-6">
      <TicketDetail ticket={ticket} />
      
      <TicketCsat ticket={ticket} />
      
      <TicketAttachments ticketId={ticket.id} />
      {!isClient && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Comentários</h2>
          <TicketComments ticketId={ticket.id} />
          <CommentForm ticketId={ticket.id} />
        </section>
      )}
    </div>
  );
}

export default TicketDetailPage;
