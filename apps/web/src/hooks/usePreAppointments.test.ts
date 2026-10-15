import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../lib/api';
import {
  preAppointmentsQueryKey,
  useCreatePreAppointment,
  useDeletePreAppointment,
  usePreAppointments,
  useStopPreAppointment,
} from './usePreAppointments';

vi.mock('../lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return createElement(QueryClientProvider, { client }, children);
}

describe('usePreAppointments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds a stable query key per ticket', () => {
    expect(preAppointmentsQueryKey('t-1')).toEqual(['tickets', 't-1', 'pre-appointments']);
  });

  it('does not fetch when ticketId is missing', async () => {
    const { result } = renderHook(() => usePreAppointments(undefined), { wrapper });

    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));
    expect(api.get).not.toHaveBeenCalled();
  });

  it('fetches pré-apontamentos for a ticket', async () => {
    const rows = [{ id: 'pre-1', ticketId: 't-1' }];
    vi.mocked(api.get).mockResolvedValueOnce({ data: rows });

    const { result } = renderHook(() => usePreAppointments('t-1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(rows);
    expect(api.get).toHaveBeenCalledWith('/tickets/t-1/pre-appointments');
  });

  it('creates a pré-apontamento and invalidates the list', async () => {
    const created = { id: 'pre-2', ticketId: 't-1' };
    vi.mocked(api.post).mockResolvedValueOnce({ data: created });
    vi.mocked(api.get).mockResolvedValue({ data: [created] });

    const { result } = renderHook(() => useCreatePreAppointment('t-1'), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ beginning: '2026-10-14T22:00:00.000Z', initTime: '19:00' });
    });

    expect(api.post).toHaveBeenCalledWith('/tickets/t-1/pre-appointments', {
      beginning: '2026-10-14T22:00:00.000Z',
      initTime: '19:00',
    });
  });

  it('creates with an empty payload by default', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ data: { id: 'pre-3' } });

    const { result } = renderHook(() => useCreatePreAppointment('t-1'), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({});
    });

    expect(api.post).toHaveBeenCalledWith('/tickets/t-1/pre-appointments', {});
  });

  it('stops a pré-apontamento via PATCH', async () => {
    vi.mocked(api.patch).mockResolvedValueOnce({ data: { id: 'pre-1', ending: '2026-10-14T23:00:00.000Z' } });

    const { result } = renderHook(() => useStopPreAppointment('t-1'), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        id: 'pre-1',
        ending: '2026-10-14T23:00:00.000Z',
        endTime: '20:00',
      });
    });

    expect(api.patch).toHaveBeenCalledWith('/tickets/t-1/pre-appointments/pre-1', {
      ending: '2026-10-14T23:00:00.000Z',
      endTime: '20:00',
    });
  });

  it('deletes a pré-apontamento', async () => {
    vi.mocked(api.delete).mockResolvedValueOnce({ data: { id: 'pre-1' } });

    const { result } = renderHook(() => useDeletePreAppointment('t-1'), { wrapper });

    await act(async () => {
      await result.current.mutateAsync('pre-1');
    });

    expect(api.delete).toHaveBeenCalledWith('/tickets/t-1/pre-appointments/pre-1');
  });
});
