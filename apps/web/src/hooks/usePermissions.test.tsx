import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useHasPermission } from './usePermissions';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

vi.mock('../lib/api', () => ({
  api: {
    get: vi.fn(),
  },
}));

function renderWithQuery(hook: () => unknown) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return renderHook(hook, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });
}

describe('useHasPermission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      token: 'fake-token',
      user: { sub: 'u-1', email: 'agent@aponta.com', role: 'AGENT' },
    });
  });

  it('returns false for a key the user does not hold, then true once the effective permissions load', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { id: 'u-1', isAdmin: false, permissions: ['MANAGE_USERS'] },
    });

    const { result } = renderWithQuery(() => useHasPermission('MANAGE_PERMISSION_GROUPS'));
    expect(result.current).toBe(false);

    const { result: managesUsers } = renderWithQuery(() => useHasPermission('MANAGE_USERS'));
    await waitFor(() => expect(managesUsers.current).toBe(true));
  });

  it('grants every permission key to an ADMIN even with an empty permissions list', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { id: 'admin-1', isAdmin: true, permissions: [] },
    });

    const { result } = renderWithQuery(() => useHasPermission('MANAGE_PERMISSION_GROUPS'));
    await waitFor(() => expect(result.current).toBe(true));
  });
});
