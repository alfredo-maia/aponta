import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../lib/api';
import { useTickets } from './useTickets';

vi.mock('../lib/api', () => ({
  api: { get: vi.fn() },
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useTickets (Busca avançada params, D8/T3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('forwards number, titleContains, requesterQuery, agentId and stageId to GET /tickets', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 1 } },
    });

    const { result } = renderHook(
      () =>
        useTickets({
          number: '0001',
          titleContains: 'impressora',
          requesterQuery: 'maria',
          agentId: 'agent-1',
          stageId: 'stage-1',
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(api.get).toHaveBeenCalledWith(
      '/tickets',
      expect.objectContaining({
        params: expect.objectContaining({
          number: '0001',
          titleContains: 'impressora',
          requesterQuery: 'maria',
          agentId: 'agent-1',
          stageId: 'stage-1',
        }),
      }),
    );
  });

  it('forwards dateField/dateFrom/dateTo and sortBy/sortDir', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 1 } },
    });

    const { result } = renderHook(
      () =>
        useTickets({
          dateField: 'closedAt',
          dateFrom: '2026-01-01',
          dateTo: '2026-01-31',
          sortBy: 'title',
          sortDir: 'asc',
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(api.get).toHaveBeenCalledWith(
      '/tickets',
      expect.objectContaining({
        params: expect.objectContaining({
          dateField: 'closedAt',
          dateFrom: '2026-01-01',
          dateTo: '2026-01-31',
          sortBy: 'title',
          sortDir: 'asc',
        }),
      }),
    );
  });

  it('forwards agentIds as a comma-less array for the Kanban avatar filter', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 1 } },
    });

    const { result } = renderHook(
      () => useTickets({ agentIds: ['a1', 'a2'] }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(api.get).toHaveBeenCalledWith(
      '/tickets',
      expect.objectContaining({
        params: expect.objectContaining({ agentIds: ['a1', 'a2'] }),
      }),
    );
  });

  it('omits the new optional params entirely when not provided', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 1 } },
    });

    const { result } = renderHook(() => useTickets({}), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const params = vi.mocked(api.get).mock.calls[0][1]?.params;
    expect(params).not.toHaveProperty('number');
    expect(params).not.toHaveProperty('titleContains');
    expect(params).not.toHaveProperty('requesterQuery');
    expect(params).not.toHaveProperty('agentId');
    expect(params).not.toHaveProperty('agentIds');
    expect(params).not.toHaveProperty('stageId');
    expect(params).not.toHaveProperty('dateField');
    expect(params).not.toHaveProperty('dateFrom');
    expect(params).not.toHaveProperty('dateTo');
    expect(params).not.toHaveProperty('sortBy');
    expect(params).not.toHaveProperty('sortDir');
  });
});
