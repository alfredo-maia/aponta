import { useParams } from 'react-router-dom';
import { CommentForm } from '../components/tickets/CommentForm';
import { TicketComments } from '../components/tickets/TicketComments';
import { TicketDetail } from '../components/tickets/TicketDetail';
import { useTicket } from '../hooks/useTicket';

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: ticket, isLoading, isError } = useTicket(id);

  if (isLoading) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Loading ticket…
      </p>
    );
  }

  // The API returns 404 both for unknown ids and for tickets a CLIENT does
  // not own, so the error copy covers both cases without distinguishing them.
  if (isError || !ticket) {
    return (
      <p role="alert" className="text-sm text-red-600">
        Failed to load ticket. It may not exist or you may not have access.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <TicketDetail ticket={ticket} />
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Comments</h2>
        <TicketComments ticketId={ticket.id} />
        <CommentForm ticketId={ticket.id} />
      </section>
    </div>
  );
}

export default TicketDetailPage;
