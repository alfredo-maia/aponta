import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { ContractsPage } from './ContractsPage';

vi.mock('../lib/api', () => ({
  api: {
    get: vi.fn(),
  },
}));

const contracts = [
  {
    id: 'c1',
    organizationId: 'org-1',
    organization: { name: 'Empresa A' },
    type: 'HOURS_LIMIT',
    active: true,
    monthlyValue: 5000,
    hoursLimit: 40,
    adjustmentDate: '2026-01-15T00:00:00.000Z',
    createdAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'c2',
    organizationId: 'org-2',
    organization: { name: 'Empresa B' },
    type: 'COVERAGE',
    active: true,
    createdAt: '2025-02-01T00:00:00.000Z',
  },
];

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/contracts']}>
        <Routes>
          <Route path="/contracts" element={<ContractsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function loginAs(role: 'ADMIN' | 'AGENT' | 'CLIENT_MASTER') {
  useAuthStore.setState({
    token: 'fake-token',
    user: { sub: 'u-1', email: 'user@aponta.com', role },
  });
}

describe('ContractsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ token: null, user: null });
  });

  it('shows a loading state while contracts are being fetched', () => {
    vi.mocked(api.get).mockReturnValue(
      new Promise(() => {
        // Never resolves, keeping the query in its loading state.
      }),
    );
    loginAs('ADMIN');
    renderPage();

    expect(screen.getByText(/carregando contratos/i)).toBeInTheDocument();
  });

  it('shows an error state when the contracts request fails', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('network error'));
    loginAs('ADMIN');
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/erro ao carregar os contratos/i)).toBeInTheDocument();
    });
  });

  it('shows the empty state when there are no contracts', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [] });
    loginAs('ADMIN');
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/nenhum contrato ativo/i)).toBeInTheDocument();
    });
  });

  it('shows financial columns (valor mensal / reajuste) for ADMIN', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: contracts });
    loginAs('ADMIN');
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Empresa A')).toBeInTheDocument();
    });

    expect(screen.getByText(/R\$ 5\.000/)).toBeInTheDocument();
    expect(screen.getByText('Pacote: 40h')).toBeInTheDocument();
    expect(screen.getByText('Cobertura')).toBeInTheDocument();
  });

  it('shows financial columns for CLIENT_MASTER as well', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: contracts });
    loginAs('CLIENT_MASTER');
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/R\$ 5\.000/)).toBeInTheDocument();
    });
  });

  it('hides financial columns for AGENT (masked by the backend, but double-check the UI gate too)', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: contracts });
    loginAs('AGENT');
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Empresa A')).toBeInTheDocument();
    });

    expect(screen.queryByText(/R\$ 5\.000/)).not.toBeInTheDocument();
    expect(screen.queryByText('Aditivo / Global')).not.toBeInTheDocument();
    expect(screen.queryByText('Reajuste')).not.toBeInTheDocument();
  });
});
