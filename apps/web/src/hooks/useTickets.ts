import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export type TicketStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'CLOSED'
  | 'PENDING_CUSTOMER'
  | 'ON_HOLD'
  | 'PENDING_APPROVAL'
  | 'ESCALATED';

export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type TicketSource = 'WEB' | 'EMAIL' | 'WHATSAPP';

export type SlaStatus = 'ON_TRACK' | 'AT_RISK' | 'BREACHED';

export interface Ticket {
  id: string;
  protocol: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  source?: TicketSource;
  requesterId: string;
  requester?: {
    id: string;
    name: string;
    email: string;
    organizationId: string | null;
    organization?: { id: string; name: string } | null;
  };
  agentId: string | null;
  agent?: { id: string; name: string } | null;
  serviceDeskId: string;
  responseDeadline: string | null;
  resolveDeadline: string | null;
  closedAt?: string | null;
  slaPausedAt?: string | null;
  slaAccumulatedPauseTime?: number;
  responseSlaStatus?: SlaStatus | null;
  resolveSlaStatus?: SlaStatus | null;
  csatScore?: number | null;
  csatComment?: string | null;
  parentTicketId?: string | null;
  parentTicket?: {
    id: string;
    protocol: string;
    title: string;
    status: TicketStatus;
  } | null;
  subTickets?: {
    id: string;
    protocol: string;
    title: string;
    status: TicketStatus;
  }[];
  serviceDesk?: {
    id?: string;
    name?: string;
    displayName?: string | null;
    evaluationEnabled?: boolean;
    ticketSections?: { key: string; enabled: boolean; sortOrder: number }[];
  };
  stageId?: string | null;
  stage?: {
    id: string;
    name: string;
    isInitial: boolean;
    isFinal: boolean;
  } | null;
  /** Stages reachable from the ticket's current stage (desk-configured `TicketStageTransition`), for "Próximo Estágio". */
  nextStages?: {
    id: string;
    name: string;
    isFinal: boolean;
    position: number;
  }[];
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
  organizationId?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
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
  /** Busca avançada "Número" — substring do protocolo. */
  number?: string;
  /** Busca avançada "Título" — substring do título. */
  titleContains?: string;
  /** Busca avançada "Solicitante" — substring de nome/e-mail. */
  requesterQuery?: string;
  /** Busca avançada "Atendente". */
  agentId?: string;
  /** Kanban: filtro de avatares (multi-seleção). */
  agentIds?: string[];
  /** Busca avançada "Estágio" (desabilitado até escolher a Mesa). */
  stageId?: string;
  /** Busca avançada "Data": abertura (createdAt, padrão) ou fechamento. */
  dateField?: 'createdAt' | 'closedAt';
  dateFrom?: string;
  dateTo?: string;
  /** Kanban "Ordenar" / Busca avançada — campo e direção de ordenação. */
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
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
  const {
    serviceDeskId,
    organizationId,
    status,
    priority,
    search,
    page,
    mine,
    unassigned,
    paused,
    overdue,
    notClosed,
    number,
    titleContains,
    requesterQuery,
    agentId,
    agentIds,
    stageId,
    dateField,
    dateFrom,
    dateTo,
    sortBy,
    sortDir,
  } = filters;

  return useQuery({
    queryKey: [
      'tickets',
      {
        serviceDeskId: serviceDeskId ?? null,
        organizationId: organizationId ?? null,
        status: status ?? null,
        priority: priority ?? null,
        search: search ?? null,
        page: page ?? 1,
        mine: mine ?? false,
        unassigned: unassigned ?? false,
        paused: paused ?? false,
        overdue: overdue ?? false,
        notClosed: notClosed ?? false,
        number: number ?? null,
        titleContains: titleContains ?? null,
        requesterQuery: requesterQuery ?? null,
        agentId: agentId ?? null,
        agentIds: agentIds ?? null,
        stageId: stageId ?? null,
        dateField: dateField ?? null,
        dateFrom: dateFrom ?? null,
        dateTo: dateTo ?? null,
        sortBy: sortBy ?? null,
        sortDir: sortDir ?? null,
      },
    ],
    queryFn: async () => {
      const { data } = await api.get<TicketsPage>('/tickets', {
        params: {
          ...(serviceDeskId ? { serviceDeskId } : {}),
          ...(organizationId ? { organizationId } : {}),
          ...(status ? { status } : {}),
          ...(priority ? { priority } : {}),
          ...(search ? { search } : {}),
          ...(mine ? { mine: 'true' } : {}),
          ...(unassigned ? { unassigned: 'true' } : {}),
          ...(paused ? { paused: 'true' } : {}),
          ...(overdue ? { overdue: 'true' } : {}),
          ...(notClosed ? { notClosed: 'true' } : {}),
          ...(number ? { number } : {}),
          ...(titleContains ? { titleContains } : {}),
          ...(requesterQuery ? { requesterQuery } : {}),
          ...(agentId ? { agentId } : {}),
          ...(agentIds && agentIds.length > 0 ? { agentIds } : {}),
          ...(stageId ? { stageId } : {}),
          ...(dateField ? { dateField } : {}),
          ...(dateFrom ? { dateFrom } : {}),
          ...(dateTo ? { dateTo } : {}),
          ...(sortBy ? { sortBy } : {}),
          ...(sortDir ? { sortDir } : {}),
          page: page ?? 1,
          limit: 20,
        },
      });
      return data;
    },
    // Defensive: normalize so `.data` is always an array for every consumer,
    // even if the backend/proxy ever returns an unexpected payload shape.
    select: (page) => ({
      ...page,
      data: Array.isArray(page?.data) ? page.data : [],
    }),
  });
}

export default useTickets;
