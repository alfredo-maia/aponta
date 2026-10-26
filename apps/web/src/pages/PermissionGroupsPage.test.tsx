import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PermissionGroupsPage } from './PermissionGroupsPage';
import { api } from '../lib/api';

vi.mock('../lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const GROUP_LIST = [
  { id: 'pg-1', name: 'Atendente Padrão', description: 'Grupo padrão', permissions: ['VIEW_AND_OPEN_TICKETS'] },
];

const GROUP_DETAIL = {
  ...GROUP_LIST[0],
  userMembers: [{ user: { id: 'user-1', name: 'Ana Silva', email: 'ana@aponta.com' } }],
  technicalGroupLinks: [],
};

const CATALOG = [
  { key: 'VIEW_AND_OPEN_TICKETS', category: 'MANAGEMENT', label: 'Visualizar e abrir tickets' },
  { key: 'EDIT_CLOSED_TICKETS', category: 'MANAGEMENT', label: 'Editar tickets fechados' },
  { key: 'MANAGE_USERS', category: 'ADMINISTRATIVE', label: 'Gerenciar usuários' },
];

const ALL_USERS = [
  { id: 'user-1', name: 'Ana Silva', email: 'ana@aponta.com', role: 'AGENT', organizationId: null },
  { id: 'user-2', name: 'Carlos Dias', email: 'carlos@aponta.com', role: 'AGENT', organizationId: null },
];

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <PermissionGroupsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('PermissionGroupsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/permission-groups') return Promise.resolve({ data: GROUP_LIST });
      if (url === '/permission-groups/pg-1') return Promise.resolve({ data: GROUP_DETAIL });
      if (url === '/permission-groups/catalog') return Promise.resolve({ data: CATALOG });
      if (url === '/users') return Promise.resolve({ data: ALL_USERS });
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });
    vi.mocked(api.post).mockResolvedValue({ data: {} });
    vi.mocked(api.patch).mockResolvedValue({ data: GROUP_DETAIL });
  });

  it('lists permission groups from GET /permission-groups', async () => {
    renderPage();
    expect(await screen.findByText('Atendente Padrão')).toBeInTheDocument();
  });

  it('renders the permission matrix grouped by category from the catalog', async () => {
    renderPage();
    await userEvent.click(await screen.findByText('Atendente Padrão'));
    await userEvent.click(await screen.findByRole('tab', { name: /permissões/i }));

    expect(await screen.findByText('Visualizar e abrir tickets')).toBeInTheDocument();
    expect(screen.getByText('Editar tickets fechados')).toBeInTheDocument();
    expect(screen.getByText('Gerenciar usuários')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /visualizar e abrir tickets/i })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /editar tickets fechados/i })).not.toBeChecked();
  });

  it('"Selecionar todos" checks every permission in that category only, and Save persists the result', async () => {
    renderPage();
    await userEvent.click(await screen.findByText('Atendente Padrão'));
    await userEvent.click(await screen.findByRole('tab', { name: /permissões/i }));
    await screen.findByText('Visualizar e abrir tickets');

    await userEvent.click(screen.getByRole('checkbox', { name: /selecionar todos \(permissões de gestão\)/i }));

    expect(screen.getByRole('checkbox', { name: /editar tickets fechados/i })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /gerenciar usuários/i })).not.toBeChecked();

    await userEvent.click(screen.getByRole('button', { name: /salvar permissões/i }));

    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith('/permission-groups/pg-1/permissions', {
        permissions: expect.arrayContaining(['VIEW_AND_OPEN_TICKETS', 'EDIT_CLOSED_TICKETS']),
      }),
    );
    const [, body] = vi.mocked(api.patch).mock.calls[0] as [string, { permissions: string[] }];
    expect(body.permissions).not.toContain('MANAGE_USERS');
  });

  it('adds a user link via POST /permission-groups/:id/users/:userId', async () => {
    renderPage();
    await userEvent.click(await screen.findByText('Atendente Padrão'));
    await userEvent.click(screen.getByRole('tab', { name: /vínculos/i }));

    await screen.findByText('Carlos Dias');
    await userEvent.click(screen.getAllByTitle('Adicionar')[0]);

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/permission-groups/pg-1/users/user-2'),
    );
  });
});
