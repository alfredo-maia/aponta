import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Ticket } from './useTickets';

/**
 * Fetches a single ticket via `GET /tickets/:id` (Task 5). The `Ticket` type
 * is reused from `useTickets` so list and detail views can never drift apart.
 * The server enforces ownership/visibility (404 for CLIENTs on foreign
 * tickets), which surfaces here as the query error state.
 */
export function useTicket(id: string | undefined) {
  return useQuery({
    queryKey: ['tickets', id ?? null],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<Ticket>(`/tickets/${id}`);
      return data;
    },
  });
}

export default useTicket;
