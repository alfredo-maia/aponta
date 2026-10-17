import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../lib/api';
import { useActivityTimer } from './useActivityTimer';
import type { PreAppointment } from './usePreAppointments';

vi.mock('../lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

let store: PreAppointment[] = [];

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return createElement(QueryClientProvider, { client }, children);
}

describe('useActivityTimer', () => {
  beforeEach(() => {
    store = [];
    vi.clearAllMocks();
    vi.mocked(api.get).mockImplementation((url) =>
      Promise.resolve({
        data: String(url).includes('worklog-contracts')
          ? [{ id: 'contract-1' }]
          : [...store],
      }),
    );
    vi.mocked(api.post).mockImplementation((_url: string, body?: unknown) => {
      const input = (body || {}) as { beginning?: string; initTime?: string };
      const created: PreAppointment = {
        id: `pre-${store.length + 1}`,
        beginning: input.beginning || new Date().toISOString(),
        ending: null,
        initTime: input.initTime || '00:00',
        endTime: null,
        ticketId: 'ticket-1',
        authorId: 'u-1',
        createdAt: new Date().toISOString(),
      };
      store = [created, ...store];
      return Promise.resolve({ data: created });
    });
    vi.mocked(api.patch).mockImplementation((url: string, body?: unknown) => {
      const id = String(url).split('/').pop();
      const input = (body || {}) as { ending?: string; endTime?: string };
      store = store.map((row) =>
        row.id === id
          ? {
              ...row,
              ending: input.ending || new Date().toISOString(),
              endTime: input.endTime || '00:00',
            }
          : row,
      );
      return Promise.resolve({ data: store.find((row) => row.id === id) });
    });
    vi.mocked(api.delete).mockImplementation((url: string) => {
      const id = String(url).split('/').pop();
      store = store.filter((row) => row.id !== id);
      return Promise.resolve({ data: { id } });
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts a running pré-apontamento persisted on the server', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-14T22:36:00.000Z'));
    const { result } = renderHook(() => useActivityTimer('ticket-1'), {
      wrapper,
    });

    await act(async () => {
      await result.current.handleStartTimer();
    });

    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(result.current.timerActive).toBe(true);
    expect(result.current.timerStartISO).toBe('2026-10-14T22:36:00.000Z');
    expect(api.post).toHaveBeenCalledWith(
      '/tickets/ticket-1/pre-appointments',
      {
        contractId: 'contract-1',
        beginning: '2026-10-14T22:36:00.000Z',
        initTime: '19:36',
      },
    );
  });
  it('blocks a new timer when commercial eligibility is missing', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [] });
    const { result } = renderHook(() => useActivityTimer('ticket-1'), {
      wrapper,
    });
    await expect(result.current.handleStartTimer()).rejects.toThrow(
      'Cronômetro bloqueado',
    );
    expect(api.post).not.toHaveBeenCalled();
  });
  it('requires explicit selection when multiple contracts cover the timer', async () => {
    vi.mocked(api.get).mockImplementation((url) =>
      Promise.resolve({
        data: String(url).includes('worklog-contracts')
          ? [{ id: 'first' }, { id: 'chosen' }]
          : [],
      }),
    );
    const { result } = renderHook(() => useActivityTimer('ticket-1'), {
      wrapper,
    });
    await expect(result.current.handleStartTimer()).rejects.toThrow(
      'Selecione o contrato',
    );
    await act(async () => {
      await result.current.handleStartTimer('chosen');
    });
    expect(api.post).toHaveBeenCalledWith(
      '/tickets/ticket-1/pre-appointments',
      expect.objectContaining({ contractId: 'chosen' }),
    );
  });

  it('stop fills end time without removing the pré-apontamento', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-14T22:36:00.000Z'));
    const { result } = renderHook(() => useActivityTimer('ticket-1'), {
      wrapper,
    });

    await act(async () => {
      await result.current.handleStartTimer();
    });
    await waitFor(() => expect(result.current.running).toBeTruthy());

    vi.setSystemTime(new Date('2026-10-14T22:51:00.000Z'));
    await act(async () => {
      await result.current.handleStopTimer();
    });

    await waitFor(() => expect(result.current.timerActive).toBe(false));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].endTime).toBe('19:51');
  });

  it('starting again appends a second pré-apontamento', async () => {
    const { result } = renderHook(() => useActivityTimer('ticket-1'), {
      wrapper,
    });

    await act(async () => {
      await result.current.handleStartTimer();
    });
    await waitFor(() => expect(result.current.items).toHaveLength(1));

    await act(async () => {
      await result.current.handleStopTimer();
    });
    await waitFor(() => expect(result.current.timerActive).toBe(false));

    await act(async () => {
      await result.current.handleStartTimer();
    });
    await waitFor(() => expect(result.current.items).toHaveLength(2));
  });

  it('pause and resume freeze the clock without dropping the pré', async () => {
    const { result } = renderHook(() => useActivityTimer('ticket-1'), {
      wrapper,
    });

    await act(async () => {
      await result.current.handleStartTimer();
    });
    await waitFor(() => expect(result.current.timerActive).toBe(true));

    act(() => {
      result.current.handlePauseTimer();
    });
    expect(result.current.timerPaused).toBe(true);

    act(() => {
      result.current.handleResumeTimer();
    });
    expect(result.current.timerPaused).toBe(false);
    expect(result.current.items).toHaveLength(1);
  });

  it('stop and cancel are no-ops when nothing is running', async () => {
    const { result } = renderHook(() => useActivityTimer('ticket-1'), {
      wrapper,
    });

    await act(async () => {
      await result.current.handleStopTimer();
      await result.current.handleCancelTimer();
    });

    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('cancel without an id deletes the running pré-apontamento', async () => {
    const { result } = renderHook(() => useActivityTimer('ticket-1'), {
      wrapper,
    });

    await act(async () => {
      await result.current.handleStartTimer();
    });
    await waitFor(() => expect(result.current.running).toBeTruthy());

    await act(async () => {
      await result.current.handleCancelTimer();
    });

    await waitFor(() => expect(result.current.items).toHaveLength(0));
  });

  it('cancel removes only the targeted pré-apontamento', async () => {
    const { result } = renderHook(() => useActivityTimer('ticket-1'), {
      wrapper,
    });

    await act(async () => {
      await result.current.handleStartTimer();
    });
    await waitFor(() => expect(result.current.running).toBeTruthy());

    const id = result.current.running!.id;
    await act(async () => {
      await result.current.handleCancelTimer(id);
    });

    await waitFor(() => expect(result.current.items).toHaveLength(0));
  });

  it('treats a running row without beginning as inactive elapsed time', async () => {
    store = [
      {
        id: 'pre-open',
        beginning: '',
        ending: null,
        initTime: '',
        endTime: null,
        ticketId: 'ticket-1',
        authorId: 'u-1',
        createdAt: '2026-10-14T22:36:00.000Z',
      },
    ];

    const { result } = renderHook(() => useActivityTimer('ticket-1'), {
      wrapper,
    });

    await waitFor(() => expect(result.current.timerActive).toBe(true));
    expect(result.current.timerStartISO).toBe('');
    expect(result.current.timerSeconds).toBe(0);
  });

  it('clamps elapsed seconds at zero when the start is in the future', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-14T22:36:00.000Z'));
    store = [
      {
        id: 'pre-future',
        beginning: '2026-10-14T22:40:00.000Z',
        ending: null,
        initTime: '19:40',
        endTime: null,
        ticketId: 'ticket-1',
        authorId: 'u-1',
        createdAt: '2026-10-14T22:36:00.000Z',
      },
    ];

    const { result } = renderHook(() => useActivityTimer('ticket-1'), {
      wrapper,
    });

    await waitFor(() => expect(result.current.timerActive).toBe(true));
    expect(result.current.timerSeconds).toBe(0);
  });
});
