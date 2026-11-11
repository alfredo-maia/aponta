import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useFeatureFlag } from './useFeatureFlag';
import { api } from '../lib/api';

vi.mock('../lib/api', () => ({ api: { get: vi.fn() } }));

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('useFeatureFlag', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it('is on when the API says the flag is on', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { 'new-board': true } });
    const { result } = renderHook(() => useFeatureFlag('new-board'), { wrapper });
    await waitFor(() => expect(result.current).toBe(true));
    expect(api.get).toHaveBeenCalledWith('/feature-flags');
  });

  it('is off for a flag the API does not know', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { 'new-board': true } });
    const { result } = renderHook(() => useFeatureFlag('other'), { wrapper });
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(result.current).toBe(false);
  });

  it('is off while loading and when the API fails', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('offline'));
    const { result } = renderHook(() => useFeatureFlag('new-board'), { wrapper });
    expect(result.current).toBe(false);
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(result.current).toBe(false);
  });
});
