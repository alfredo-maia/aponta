import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../lib/api';
import { VaultAuditPage } from './VaultAuditPage';

vi.mock('../lib/api', () => ({
  api: {
    get: vi.fn(),
  },
}));

const agents = [
  { id: 'agent-1', name: 'Ana Admin', email: 'ana@aponta.com', role: 'ADMIN' },
  { id: 'agent-2', name: 'Bruno Agente', email: 'bruno@aponta.com', role: 'AGENT' },
];

const auditLogs = [
  {
    id: 'log-1',
    organizationId: 'org-1',
    action: 'REVEAL_CREDENTIAL',
    folderId: null,
    credentialId: 'cred-1',
    targetName: 'Servidor FTP',
    actorId: 'agent-2',
    actorName: 'Bruno Agente',
    ipAddress: '10.0.0.5',
    createdAt: '2026-01-10T12:00:00.000Z',
  },
];

function mockGets() {
  vi.mocked(api.get).mockImplementation(async (url: string) => {
    if (url === '/users/agents') return { data: agents };
    if (url === '/vault/audit') {
      return { data: { data: auditLogs, meta: { total: 1, page: 1, limit: 20, totalPages: 1 } } };
    }
    throw new Error(`Unexpected GET ${url}`);
  });
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/vault/audit']}>
        <VaultAuditPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('VaultAuditPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the fixed IP/horário notice and the 4 filters, without querying the audit log yet', async () => {
    mockGets();
    renderPage();

    expect(screen.getByText(/endereço ip de origem e o horário exato/i)).toBeInTheDocument();
    expect(screen.getByText(/defina os filtros e clique em exibir/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Todos os atendentes')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Todas as ações')).toBeInTheDocument();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/users/agents');
    });
    expect(api.get).not.toHaveBeenCalledWith('/vault/audit', expect.anything());
  });

  it('queries the audit log with the selected filters once "Exibir" is clicked', async () => {
    mockGets();
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByPlaceholderText('Todos os atendentes')).toBeInTheDocument());

    await user.type(screen.getByLabelText(/buscar \(cofre, pasta ou senha\)/i), 'FTP');
    await user.click(screen.getByRole('button', { name: /exibir/i }));

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        '/vault/audit',
        expect.objectContaining({ params: expect.objectContaining({ query: 'FTP', page: 1 }) }),
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Servidor FTP')).toBeInTheDocument();
    });
    expect(screen.getByText('Bruno Agente')).toBeInTheDocument();
    expect(screen.getByText('Revelou a senha')).toBeInTheDocument();
    expect(screen.getByText('10.0.0.5')).toBeInTheDocument();
  });

  it('shows an empty state when no audit entries match the filters', async () => {
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/users/agents') return { data: [] };
      if (url === '/vault/audit') {
        return { data: { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 1 } } };
      }
      throw new Error(`Unexpected GET ${url}`);
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /exibir/i }));

    await waitFor(() => {
      expect(screen.getByText(/nenhum registro de auditoria encontrado/i)).toBeInTheDocument();
    });
  });

  it('shows an error state when the audit request fails', async () => {
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/users/agents') return { data: [] };
      if (url === '/vault/audit') throw new Error('network error');
      throw new Error(`Unexpected GET ${url}`);
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /exibir/i }));

    await waitFor(() => {
      expect(screen.getByText(/erro ao carregar a auditoria/i)).toBeInTheDocument();
    });
  });
});
