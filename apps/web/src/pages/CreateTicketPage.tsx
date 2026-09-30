import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import type { Ticket } from '../hooks/useTickets';
import type { TicketFormValues } from '../components/tickets/TicketForm';
import { TicketForm } from '../components/tickets/TicketForm';

/**
 * Create-ticket page. On success the tickets-list query (keyed with the
 * `'tickets'` prefix used by `useTickets`) is invalidated so the dashboard
 * reflects the new ticket without a manual reload — same convention Task 9's
 * `CommentForm` used for the comments query — and the user is redirected to
 * the new ticket's detail page via the id returned by the API.
 */
export function CreateTicketPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (values: TicketFormValues) => {
      const { data } = await api.post<Ticket>('/tickets', values);
      return data;
    },
    onSuccess: (ticket) => {
      void queryClient.invalidateQueries({ queryKey: ['tickets'] });
      navigate(`/tickets/${ticket.id}`);
    },
    onError: () => {
      setSubmitError('Failed to create ticket. Please try again.');
    },
  });

  const onSubmit = (values: TicketFormValues) => {
    setSubmitError(null);
    mutation.mutate(values);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">New ticket</h1>
      <TicketForm
        onSubmit={onSubmit}
        isSubmitting={mutation.isPending}
        submitError={submitError}
      />
    </div>
  );
}

export default CreateTicketPage;
