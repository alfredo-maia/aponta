import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TechnicalGroupsPage } from './TechnicalGroupsPage';
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
  {
    id: 'tg-1',
    name: 'Suporte N1',
    description: 'Primeira linha',
    dailyWorklogEmailEnabled: false,
    scheduleEnabled: true,
  },
];

const GROUP_DETAIL = {
  ...GROUP_LIST[0],
  members: [{ id: 'user-1', name: 'Ana Silva', email: 'ana@aponta.com' }],
  organizationLinks: [{ organization: { id: 'org-1', name: 'Cliente A' } }],
  serviceDeskLinks: [],
  permissionGroupLinks: [],
};

const ALL_USERS = [
  { id: 'user-1', name: 'Ana Silva', email: 'ana@aponta.com', role: 'AGENT', organizationId: null },
  { id: 'user-2', name: 'Carlos Dias', email: 'carlos@aponta.com', role: 'AGENT', organizationId: null },
];

const ALL_ORGS = [
  { id: 'org-1', name: 'Cliente A' },
  { id: 'org-2', name: 'Cliente B' },
];

const ALL_DESKS = [{ id: 'desk-1', name: 'Mesa Principal' }];

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <TechnicalGroupsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('TechnicalGroupsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/technical-groups') return Promise.resolve({ data: GROUP_LIST });
      if (url === '/technical-groups/tg-1') return Promise.resolve({ data: GROUP_DETAIL });
      if (url === '/users') return Promise.resolve({ data: ALL_USERS });
      if (url === '/organizations') return Promise.resolve({ data: ALL_ORGS });
      if (url === '/service-desks') return Promise.resolve({ data: ALL_DESKS });
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });
    vi.mocked(api.post).mockResolvedValue({ data: {} });
    vi.mocked(api.delete).mockResolvedValue({ data: {} });
  });

  it('lists technical groups from GET /technical-groups', async () => {
    renderPage();
    expect(await screen.findByText('Suporte N1')).toBeInTheDocument();
  });

  it('opens a group detail with Informações, Equipe and Acessos tabs', async () => {
    renderPage();
    await userEvent.click(await screen.findByText('Suporte N1'));

    const tabs = await screen.findByRole('tablist');
    expect(tabs).toHaveTextContent(/informações/i);
    expect(tabs).toHaveTextContent(/equipe/i);
    expect(tabs).toHaveTextContent(/acessos/i);
  });

  it('adds a member on the Equipe tab via POST /technical-groups/:id/members/:userId', async () => {
    renderPage();
    await userEvent.click(await screen.findByText('Suporte N1'));
    await userEvent.click(screen.getByRole('tab', { name: /equipe/i }));

    await screen.findByText('Carlos Dias');
    await userEvent.click(screen.getAllByTitle('Adicionar')[0]);

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/technical-groups/tg-1/members/user-2'),
    );
  });

  it('removes a member on the Equipe tab via DELETE /technical-groups/:id/members/:userId', async () => {
    renderPage();
    await userEvent.click(await screen.findByText('Suporte N1'));
    await userEvent.click(screen.getByRole('tab', { name: /equipe/i }));

    await screen.findByText('Ana Silva');
    await userEvent.click(screen.getAllByTitle('Remover')[0]);

    await waitFor(() =>
      expect(api.delete).toHaveBeenCalledWith('/technical-groups/tg-1/members/user-1'),
    );
  });

  it('adds an organization access on the Acessos tab via POST .../organizations/:id', async () => {
    renderPage();
    await userEvent.click(await screen.findByText('Suporte N1'));
    await userEvent.click(screen.getByRole('tab', { name: /acessos/i }));

    await screen.findByText('Cliente B');
    const addButtons = screen.getAllByTitle('Adicionar');
    await userEvent.click(addButtons[0]);

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/technical-groups/tg-1/organizations/org-2'),
    );
  });

  it('adds a service desk access on the Acessos tab via POST .../service-desks/:id', async () => {
    renderPage();
    await userEvent.click(await screen.findByText('Suporte N1'));
    await userEvent.click(screen.getByRole('tab', { name: /acessos/i }));

    await screen.findByText('Mesa Principal');
    const addButtons = screen.getAllByTitle('Adicionar');
    await userEvent.click(addButtons[addButtons.length - 1]);

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/technical-groups/tg-1/service-desks/desk-1'),
    );
  });
});
