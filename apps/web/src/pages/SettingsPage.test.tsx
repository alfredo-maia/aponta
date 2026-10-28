import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsPage } from './SettingsPage';
import { useAuthStore } from '../stores/authStore';
import { api } from '../lib/api';

vi.mock('../lib/api', () => ({
  api: {
    get: vi.fn(),
  },
}));

function renderSettingsPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function mockMe(overrides: { isAdmin?: boolean; permissions?: string[] }) {
  vi.mocked(api.get).mockResolvedValue({
    data: { id: 'u-1', isAdmin: false, permissions: [], ...overrides },
  });
}

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ token: null, user: null });
  });

  it('always shows Minha conta inside the Usuários submenu, regardless of permissions', async () => {
    useAuthStore.setState({
      token: 'fake-token',
      user: { sub: 'u-1', email: 'agent@aponta.com', role: 'AGENT' },
    });
    mockMe({ permissions: [] });

    renderSettingsPage();

    expect(
      await screen.findByRole('link', { name: /minha conta/i }),
    ).toHaveAttribute('href', '/my-account');
  });

  it('shows Usuários and Grupos de atendentes only for a user with MANAGE_USERS', async () => {
    useAuthStore.setState({
      token: 'fake-token',
      user: { sub: 'u-1', email: 'agent@aponta.com', role: 'AGENT' },
    });
    mockMe({ permissions: ['MANAGE_USERS'] });

    renderSettingsPage();

    expect(await screen.findByRole('link', { name: /^usuários$/i })).toHaveAttribute(
      'href',
      '/settings/users',
    );
    expect(screen.getByRole('link', { name: /grupos de atendentes/i })).toHaveAttribute(
      'href',
      '/settings/technical-groups',
    );
    expect(screen.queryByRole('link', { name: /grupos de permissões/i })).not.toBeInTheDocument();
  });

  it('shows Grupos de permissões only for a user with MANAGE_PERMISSION_GROUPS', async () => {
    useAuthStore.setState({
      token: 'fake-token',
      user: { sub: 'u-1', email: 'agent@aponta.com', role: 'AGENT' },
    });
    mockMe({ permissions: ['MANAGE_PERMISSION_GROUPS'] });

    renderSettingsPage();

    expect(
      await screen.findByRole('link', { name: /grupos de permissões/i }),
    ).toHaveAttribute('href', '/settings/permission-groups');
    expect(screen.queryByRole('link', { name: /^usuários$/i })).not.toBeInTheDocument();
  });

  it('shows every Usuários submenu item for an ADMIN even with no PermissionGroup linked', async () => {
    useAuthStore.setState({
      token: 'fake-token',
      user: { sub: 'admin-1', email: 'admin@aponta.com', role: 'ADMIN' },
    });
    mockMe({ isAdmin: true, permissions: [] });

    renderSettingsPage();

    expect(await screen.findByRole('link', { name: /^usuários$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /grupos de atendentes/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /grupos de permissões/i })).toBeInTheDocument();
  });

  it('does not show Usuários/Grupos links for a user without MANAGE_USERS or MANAGE_PERMISSION_GROUPS', async () => {
    useAuthStore.setState({
      token: 'fake-token',
      user: { sub: 'u-1', email: 'client@aponta.com', role: 'CLIENT' },
    });
    mockMe({ permissions: [] });

    renderSettingsPage();

    await screen.findByRole('link', { name: /minha conta/i });
    expect(screen.queryByRole('link', { name: /^usuários$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /grupos de atendentes/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /grupos de permissões/i })).not.toBeInTheDocument();
  });

  it('should render a link to Mesa only for ADMIN', async () => {
    useAuthStore.setState({
      token: 'fake-token',
      user: { sub: 'u-1', email: 'admin@aponta.com', role: 'ADMIN' },
    });
    mockMe({ isAdmin: true, permissions: [] });

    renderSettingsPage();

    expect(
      await screen.findByRole('link', { name: /^mesa$/i }),
    ).toHaveAttribute('href', '/service-desks');
  });

  it('should not render the Mesa link for a non-ADMIN user', async () => {
    useAuthStore.setState({
      token: 'fake-token',
      user: { sub: 'u-1', email: 'client@aponta.com', role: 'CLIENT' },
    });
    mockMe({ permissions: [] });

    renderSettingsPage();

    await screen.findByRole('link', { name: /minha conta/i });
    expect(screen.queryByRole('link', { name: /^mesa$/i })).not.toBeInTheDocument();
  });
});
