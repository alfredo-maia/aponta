import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { OrganizationsPage } from './OrganizationsPage';

vi.mock('../lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

const orgs = [
  { id: 'org-1', name: 'Empresa A', _count: { users: 2 } },
  { id: 'org-2', name: 'Empresa B', _count: { users: 0 } },
];

const users = [
  { id: 'u-1', name: 'Cliente Um', email: 'c1@example.com', role: 'CLIENT', organizationId: 'org-1' },
  { id: 'u-2', name: 'Cliente Dois', email: 'c2@example.com', role: 'CLIENT_MASTER', organizationId: null },
  { id: 'u-3', name: 'Agente', email: 'agent@example.com', role: 'AGENT', organizationId: null },
];

function mockApiGet() {
  vi.mocked(api.get).mockImplementation((url: string) => {
    if (url === '/organizations') return Promise.resolve({ data: orgs });
    if (url === '/users') return Promise.resolve({ data: users });
    return Promise.reject(new Error(`Unexpected GET ${url}`));
  });
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/organizations']}>
        <Routes>
          <Route path="/organizations" element={<OrganizationsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function loginAs(role: 'ADMIN' | 'AGENT') {
  useAuthStore.setState({
    token: 'fake-token',
    user: { sub: 'u-1', email: 'user@aponta.com', role },
  });
}

describe('OrganizationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiGet();
    useAuthStore.setState({ token: null, user: null });
  });

  it('shows an access-denied message for non-ADMIN roles', () => {
    loginAs('AGENT');
    renderPage();

    expect(
      screen.getByText(/somente administradores podem gerenciar empresas/i),
    ).toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalled();
  });

  it('lists organizations with their client count for ADMIN', async () => {
    loginAs('ADMIN');
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Empresa A')).toBeInTheDocument();
    });

    expect(screen.getByText('Clientes: 2')).toBeInTheDocument();
    expect(screen.getByText('Empresa B')).toBeInTheDocument();
    expect(screen.getByText('Clientes: 0')).toBeInTheDocument();
  });

  it('validates the new-organization form and blocks empty submission', async () => {
    loginAs('ADMIN');
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Empresa A')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /cadastrar/i }));

    await waitFor(() => {
      expect(screen.getByText(/nome é obrigatório/i)).toBeInTheDocument();
    });
    expect(api.post).not.toHaveBeenCalled();
  });

  it('creates a new organization and resets the form', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { id: 'org-3', name: 'Empresa C' } });
    loginAs('ADMIN');
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Empresa A')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/nome da empresa/i), 'Empresa C');
    await user.click(screen.getByRole('button', { name: /cadastrar/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/organizations', { name: 'Empresa C' });
    });
  });

  it('expands the "Vincular Usuários" panel and lists only CLIENT/CLIENT_MASTER users', async () => {
    loginAs('ADMIN');
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Empresa A')).toBeInTheDocument();
    });

    const linkButtons = screen.getAllByRole('button', { name: /vincular usuários/i });
    await user.click(linkButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Cliente Um')).toBeInTheDocument();
    });

    expect(screen.getByText('Cliente Dois')).toBeInTheDocument();
    expect(screen.queryByText('Agente')).not.toBeInTheDocument();
    // Cliente Um already belongs to org-1 -> shows "Remover"
    expect(screen.getByRole('button', { name: /remover/i })).toBeInTheDocument();
    // Cliente Dois does not belong -> shows "Adicionar"
    expect(screen.getByRole('button', { name: /adicionar/i })).toBeInTheDocument();
  });

  it('attaches a user to an organization when clicking "Adicionar"', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: {} });
    loginAs('ADMIN');
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Empresa A')).toBeInTheDocument();
    });

    await user.click(screen.getAllByRole('button', { name: /vincular usuários/i })[0]);

    await waitFor(() => {
      expect(screen.getByText('Cliente Dois')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /adicionar/i }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/users/u-2', { organizationId: 'org-1' });
    });
  });

  it('shows the empty state when there are no organizations', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/organizations') return Promise.resolve({ data: [] });
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });
    loginAs('ADMIN');
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/nenhuma empresa cadastrada/i)).toBeInTheDocument();
    });
  });
});
