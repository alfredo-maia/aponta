import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'PENDING_CUSTOMER' | 'ON_HOLD' | 'PENDING_APPROVAL' | 'ESCALATED';

export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type SlaStatus = 'ON_TRACK' | 'AT_RISK' | 'BREACHED';

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
  slaPausedAt?: string | null;
  slaAccumulatedPauseTime?: number;
  responseSlaStatus?: SlaStatus | null;
  resolveSlaStatus?: SlaStatus | null;
  csatScore?: number | null;
  csatComment?: string | null;
  parentTicketId?: string | null;
  parentTicket?: { id: string; protocol: string; title: string; status: TicketStatus; } | null;
  subTickets?: { id: string; protocol: string; title: string; status: TicketStatus; }[];
  createdAt: string;
  updatedAt: string;
}

export interface TicketsMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TicketsPage {
  data: Ticket[];
  meta: TicketsMeta;
}

export interface TicketFiltersInput {
  serviceDeskId?: string;
  status?: TicketStatus;
  search?: string;
  page?: number;
  /** "Meus" KPI: tickets assigned to the current user. */
  mine?: boolean;
  /** "Não atendidos" KPI: open tickets with no agent assigned. */
  unassigned?: boolean;
  /** "Pausados" KPI: ON_HOLD / PENDING_CUSTOMER / PENDING_APPROVAL. */
  paused?: boolean;
  /** "Vencidos" KPI: SLA response or resolve deadline breached. */
  overdue?: boolean;
  /** Only tickets not yet RESOLVED/CLOSED — used by the Agenda ticket picker. */
  notClosed?: boolean;
}

/**
 * Fetches the visible ticket queue via `GET /tickets` (Task 5, extended in
 * Issue #08 with search + pagination). Filters are optional and map
 * directly to the endpoint's query params; the server already scopes
 * results by role (CLIENTs only see their own tickets), so no client-side
 * filtering is applied. The filter values are part of the query key
 * (normalized with `?? null` so `undefined` and "no filter" hash the
 * same), which makes Tanstack Query cache and refetch per filter+page
 * combination.
 */
export function useTickets(filters: TicketFiltersInput = {}) {
  const { serviceDeskId, status, search, page, mine, unassigned, paused, overdue, notClosed } = filters;

  return useQuery({
    queryKey: [
      'tickets',
      {
        serviceDeskId: serviceDeskId ?? null,
        status: status ?? null,
        search: search ?? null,
        page: page ?? 1,
        mine: mine ?? false,
        unassigned: unassigned ?? false,
        paused: paused ?? false,
        overdue: overdue ?? false,
        notClosed: notClosed ?? false,
      },
    ],
    queryFn: async () => {
      const { data } = await api.get<TicketsPage>('/tickets', {
        params: {
          ...(serviceDeskId ? { serviceDeskId } : {}),
          ...(status ? { status } : {}),
          ...(search ? { search } : {}),
          ...(mine ? { mine: 'true' } : {}),
          ...(unassigned ? { unassigned: 'true' } : {}),
          ...(paused ? { paused: 'true' } : {}),
          ...(overdue ? { overdue: 'true' } : {}),
          ...(notClosed ? { notClosed: 'true' } : {}),
          page: page ?? 1,
          limit: 20,
        },
      });
      return data;
    },
  });
}

export default useTickets;
