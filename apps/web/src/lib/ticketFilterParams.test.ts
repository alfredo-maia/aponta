import { describe, expect, it } from 'vitest';
import {
  filtersToSearchParams,
  parseFiltersFromSearchParams,
} from './ticketFilterParams';

describe('parseFiltersFromSearchParams (D4/D8)', () => {
  it('parses every Busca avançada field from the URL', () => {
    const params = new URLSearchParams({
      number: '0001',
      titleContains: 'impressora',
      requesterQuery: 'maria',
      agentId: 'agent-1',
      stageId: 'stage-1',
      dateField: 'closedAt',
      dateFrom: '2026-01-01',
      dateTo: '2026-01-31',
    });

    expect(parseFiltersFromSearchParams(params)).toEqual({
      number: '0001',
      titleContains: 'impressora',
      requesterQuery: 'maria',
      agentId: 'agent-1',
      stageId: 'stage-1',
      dateField: 'closedAt',
      dateFrom: '2026-01-01',
      dateTo: '2026-01-31',
    });
  });

  it('round-trips through filtersToSearchParams and back', () => {
    const original = {
      serviceDeskId: 'sd-1',
      organizationId: 'org-1',
      status: 'OPEN' as const,
      priority: 'HIGH' as const,
      search: 'vpn',
      number: '0042',
      titleContains: 'vpn',
      requesterQuery: 'joão',
      agentId: 'agent-7',
      stageId: 'stage-2',
      dateField: 'createdAt' as const,
      dateFrom: '2026-02-01',
      dateTo: '2026-02-28',
      mine: true,
      unassigned: true,
      paused: true,
      overdue: true,
      notClosed: true,
      closedOnly: true,
    };

    const roundTripped = parseFiltersFromSearchParams(
      filtersToSearchParams(original),
    );

    expect(roundTripped).toEqual(original);
  });
});
