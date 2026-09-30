import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Ticket {
  id: string;
  protocol: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  requesterId: string;
  agentId: string | null;
  serviceDeskId: string;
  responseDeadline: string | null;
  resolveDeadline: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TicketFiltersInput {
  serviceDeskId?: string;
  status?: TicketStatus;
}

/**
 * Fetches the visible ticket queue via `GET /tickets` (Task 5). Both filters
 * are optional and map directly to the endpoint's query params; the server
 * already scopes results by role (CLIENTs only see their own tickets), so no
 * client-side filtering is applied. The filter values are part of the query
 * key (normalized with `?? null` so `undefined` and "no filter" hash the
 * same), which makes Tanstack Query cache and refetch per filter combination.
 */
export function useTickets(filters: TicketFiltersInput = {}) {
  const { serviceDeskId, status } = filters;

  return useQuery({
    queryKey: [
      'tickets',
      { serviceDeskId: serviceDeskId ?? null, status: status ?? null },
    ],
    queryFn: async () => {
      const { data } = await api.get<Ticket[]>('/tickets', {
        params: {
          ...(serviceDeskId ? { serviceDeskId } : {}),
          ...(status ? { status } : {}),
        },
      });
      return data;
    },
  });
}

export default useTickets;
