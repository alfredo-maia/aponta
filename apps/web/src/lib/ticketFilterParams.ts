import type { TicketFiltersInput } from '../hooks/useTickets';

/**
 * Reads a `TicketFiltersInput` from URL search params — shared by
 * `TicketsPage` (reads on load, e.g. a dashboard KPI link `?mine=true`) and
 * `TicketAdvancedSearchPage` ("Buscar" writes these same params before
 * navigating back to `/`, SPEC DMTE-137 D4). Kept as the single source of
 * truth so both stay in sync.
 */
export function parseFiltersFromSearchParams(
  params: URLSearchParams,
): TicketFiltersInput {
  const filters: TicketFiltersInput = {};
  const serviceDeskId = params.get('serviceDeskId');
  if (serviceDeskId) filters.serviceDeskId = serviceDeskId;
  const organizationId = params.get('organizationId');
  if (organizationId) filters.organizationId = organizationId;
  const status = params.get('status');
  if (status) filters.status = status as TicketFiltersInput['status'];
  const priority = params.get('priority');
  if (priority) filters.priority = priority as TicketFiltersInput['priority'];
  const search = params.get('search');
  if (search) filters.search = search;
  const page = Number(params.get('page'));
  if (Number.isFinite(page) && page > 1) filters.page = page;
  if (params.get('mine') === 'true') filters.mine = true;
  if (params.get('unassigned') === 'true') filters.unassigned = true;
  if (params.get('paused') === 'true') filters.paused = true;
  if (params.get('overdue') === 'true') filters.overdue = true;
  const number = params.get('number');
  if (number) filters.number = number;
  const titleContains = params.get('titleContains');
  if (titleContains) filters.titleContains = titleContains;
  const requesterQuery = params.get('requesterQuery');
  if (requesterQuery) filters.requesterQuery = requesterQuery;
  const agentId = params.get('agentId');
  if (agentId) filters.agentId = agentId;
  const stageId = params.get('stageId');
  if (stageId) filters.stageId = stageId;
  const dateField = params.get('dateField');
  if (dateField) filters.dateField = dateField as TicketFiltersInput['dateField'];
  const dateFrom = params.get('dateFrom');
  if (dateFrom) filters.dateFrom = dateFrom;
  const dateTo = params.get('dateTo');
  if (dateTo) filters.dateTo = dateTo;
  return filters;
}

/** Inverse of `parseFiltersFromSearchParams` — keeps the URL bookmarkable/shareable. */
export function filtersToSearchParams(
  filters: TicketFiltersInput,
): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.serviceDeskId) params.set('serviceDeskId', filters.serviceDeskId);
  if (filters.organizationId) params.set('organizationId', filters.organizationId);
  if (filters.status) params.set('status', filters.status);
  if (filters.priority) params.set('priority', filters.priority);
  if (filters.search) params.set('search', filters.search);
  if (filters.page && filters.page > 1)
    params.set('page', String(filters.page));
  if (filters.mine) params.set('mine', 'true');
  if (filters.unassigned) params.set('unassigned', 'true');
  if (filters.paused) params.set('paused', 'true');
  if (filters.overdue) params.set('overdue', 'true');
  if (filters.number) params.set('number', filters.number);
  if (filters.titleContains) params.set('titleContains', filters.titleContains);
  if (filters.requesterQuery) params.set('requesterQuery', filters.requesterQuery);
  if (filters.agentId) params.set('agentId', filters.agentId);
  if (filters.stageId) params.set('stageId', filters.stageId);
  if (filters.dateField) params.set('dateField', filters.dateField);
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  return params;
}
