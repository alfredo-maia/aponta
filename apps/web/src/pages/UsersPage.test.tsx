import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UsersPage } from './UsersPage';
import { api } from '../lib/api';

vi.mock('../lib/api', () => ({
  api: {
    get: vi.fn(),
    patch: vi.fn(),
  },
}));

const USERS_PAGE_1 = {
  data: [
    {
      id: 'user-1',
      name: 'Ana Silva',
      email: 'ana@aponta.com',
      role: 'AGENT',
      active: true,
      organizationId: null,
      technicalGroup: { id: 'tg-1', name: 'Suporte N1' },
      permissionGroups: [{ id: 'pg-1', name: 'Grupo Atendimento' }],
    },
    {
      id: 'user-2',
      name: 'Bruno Costa',
      email: 'bruno@aponta.com',
      role: 'CLIENT',
      active: false,
      organizationId: 'org-1',
      technicalGroup: null,
      permissionGroups: [],
    },
  ],
  meta: { total: 2, page: 1, pageSize: 20, totalPages: 1 },
};

function renderUsersPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('UsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/users') return Promise.resolve({ data: USERS_PAGE_1 });
      if (url === '/users/user-1') return Promise.resolve({ data: USERS_PAGE_1.data[0] });
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });
  });

  it('lists users paginated from GET /users with name, groups and status columns', async () => {
    renderUsersPage();

    expect(await screen.findByText('Ana Silva')).toBeInTheDocument();
    expect(screen.getByText('Bruno Costa')).toBeInTheDocument();
    expect(screen.getByText('Suporte N1')).toBeInTheDocument();
    expect(screen.getByText('Grupo Atendimento')).toBeInTheDocument();
    expect(screen.getByText('Ativo')).toBeInTheDocument();
    expect(screen.getByText('Inativo')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith(
      '/users',
      expect.objectContaining({ params: expect.objectContaining({ page: 1 }) }),
    );
  });

  it('searches by typing in the search box, sending q to GET /users', async () => {
    renderUsersPage();
    await screen.findByText('Ana Silva');

    await userEvent.type(screen.getByPlaceholderText(/buscar usuário/i), 'ana');

    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith(
        '/users',
        expect.objectContaining({ params: expect.objectContaining({ q: 'ana', page: 1 }) }),
      ),
    );
  });

  it('opens the user detail and toggles Usuário ativo via PATCH /users/:id/active', async () => {
    vi.mocked(api.patch).mockResolvedValue({
      data: { ...USERS_PAGE_1.data[0], active: false },
    });

    renderUsersPage();
    await userEvent.click(await screen.findByText('Ana Silva'));

    const activeToggle = await screen.findByRole('checkbox', { name: /usuário ativo/i });
    expect(activeToggle).toBeChecked();

    await userEvent.click(activeToggle);

    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith('/users/user-1/active', { active: false }),
    );
  });

  it('renders Perfil and Segurança tabs in the detail view', async () => {
    renderUsersPage();
    await userEvent.click(await screen.findByText('Ana Silva'));

    const tabs = await screen.findByRole('tablist');
    expect(within(tabs).getByText(/perfil/i)).toBeInTheDocument();
    expect(within(tabs).getByText(/segurança/i)).toBeInTheDocument();
  });
});
