import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useAppointments } from './useAppointments';
import { api } from '../lib/api';

vi.mock('../lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('useAppointments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it('fetches appointments list', async () => {
    const mockData = [{ id: 'app-1', title: 'Agendamento Teste' }];
    vi.mocked(api.get).mockResolvedValueOnce({ data: mockData });

    const { result } = renderHook(() => useAppointments(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.appointments).toEqual(mockData);
    expect(api.get).toHaveBeenCalledWith('/appointments', { params: {} });
  });

  it('creates an appointment via createMutation', async () => {
    const newApp = { id: 'app-2', title: 'Novo' };
    vi.mocked(api.post).mockResolvedValueOnce({ data: newApp });

    const { result } = renderHook(() => useAppointments(), { wrapper });

    await act(async () => {
      await result.current.createMutation.mutateAsync({
        title: 'Novo',
        startTime: '2026-10-15T10:00:00Z',
        endTime: '2026-10-15T11:00:00Z',
      });
    });

    expect(api.post).toHaveBeenCalledWith('/appointments', {
      title: 'Novo',
      startTime: '2026-10-15T10:00:00Z',
      endTime: '2026-10-15T11:00:00Z',
    });
  });

  it('updates an appointment via updateMutation', async () => {
    const updated = { id: 'app-1', title: 'Alterado' };
    vi.mocked(api.patch).mockResolvedValueOnce({ data: updated });

    const { result } = renderHook(() => useAppointments(), { wrapper });

    await act(async () => {
      await result.current.updateMutation.mutateAsync({
        id: 'app-1',
        title: 'Alterado',
      });
    });

    expect(api.patch).toHaveBeenCalledWith('/appointments/app-1', {
      title: 'Alterado',
    });
  });

  it('removes an appointment via removeMutation', async () => {
    vi.mocked(api.delete).mockResolvedValueOnce({ data: null });

    const { result } = renderHook(() => useAppointments(), { wrapper });

    await act(async () => {
      await result.current.removeMutation.mutateAsync('app-1');
    });

    expect(api.delete).toHaveBeenCalledWith('/appointments/app-1');
  });
});
