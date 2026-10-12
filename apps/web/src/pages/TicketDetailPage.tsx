import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { CommentForm } from '../components/tickets/CommentForm';
import { TicketComments } from '../components/tickets/TicketComments';
import { TicketDetail } from '../components/tickets/TicketDetail';
import { TicketAttachments } from '../components/tickets/TicketAttachments';
import { TicketCsat } from '../components/tickets/TicketCsat';
import { TicketWorklogs } from '../components/tickets/TicketWorklogs';
import { useTicket } from '../hooks/useTicket';
import { useAuthStore } from '../stores/authStore';
import { EzSpinner, EzAlert } from '../components/ds';

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: ticket, isLoading, isError } = useTicket(id);
  const user = useAuthStore((state) => state.user);

  if (isLoading) {
    return (
      <div role="status">
        <EzSpinner label="Carregando chamado…" />
      </div>
    );
  }

  // The API returns 404 both for unknown ids and for tickets a CLIENT does
  // not own, so the error copy covers both cases without distinguishing them.
  if (isError || !ticket) {
    return (
      <EzAlert variant="error">
        Falha ao carregar o chamado. Ele pode não existir ou você pode não
        ter acesso a ele.
      </EzAlert>
    );
  }

  const isClient = user?.role === 'CLIENT';

  return (
    <div className="space-y-6">
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>
      <TicketDetail ticket={ticket} />

      <TicketCsat ticket={ticket} />

      <TicketAttachments ticketId={ticket.id} />
      {!isClient && (
        <>
          <TicketWorklogs ticketId={ticket.id} />
          <section className="space-y-4">
            <h2 className="text-[16px] font-semibold text-gray-900">Comentários</h2>
            <TicketComments ticketId={ticket.id} />
            <CommentForm ticketId={ticket.id} />
          </section>
        </>
      )}
    </div>
  );
}

export default TicketDetailPage;
