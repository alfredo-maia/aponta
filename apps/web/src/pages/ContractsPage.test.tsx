import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { ContractsPage } from './ContractsPage';

vi.mock('../lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
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
      expect(
        screen.getByText(/erro ao carregar os contratos/i),
      ).toBeInTheDocument();
    });
  });

  it('shows the empty state when there are no contracts', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [] });
    loginAs('ADMIN');
    renderPage();

    await waitFor(() => {
      expect(
        screen.getByText(/nenhum contrato encontrado/i),
      ).toBeInTheDocument();
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

  it('displays inactive contracts and zero money honestly', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: [{ ...contracts[0], active: false, monthlyValue: 0 }],
    });
    loginAs('ADMIN');
    renderPage();
    expect(await screen.findByText('Inativo')).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*0,00/)).toBeInTheDocument();
  });

  it('lets admins create with explicit excess rate and minute allowance', async () => {
    vi.mocked(api.get).mockImplementation(async (url) => ({
      data:
        url === '/organizations' ? [{ id: 'org-1', name: 'Empresa A' }] : [],
    }));
    vi.mocked(api.post).mockResolvedValue({
      data: { ...contracts[0], name: 'Suporte' },
    });
    loginAs('ADMIN');
    renderPage();
    fireEvent.click(
      await screen.findByRole('button', { name: 'Novo contrato' }),
    );
    await screen.findByRole('option', { name: 'Empresa A' });
    fireEvent.change(screen.getByLabelText(/Nome do contrato/), {
      target: { value: 'Suporte' },
    });
    fireEvent.change(await screen.findByLabelText(/Empresa/), {
      target: { value: 'org-1' },
    });
    fireEvent.change(screen.getByLabelText('Modalidade'), {
      target: { value: 'MONTHLY_HOURS' },
    });
    fireEvent.change(screen.getByLabelText('Franquia mensal (horas)'), {
      target: { value: '10.5' },
    });
    fireEvent.change(screen.getByLabelText('Hora excedente (R$)'), {
      target: { value: '120.25' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar contrato' }));
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        '/contracts',
        expect.objectContaining({
          name: 'Suporte',
          organizationId: 'org-1',
          includedMinutes: 630,
          excessHourlyRateCents: 12025,
        }),
      ),
    );
  });

  it('prevents non-admin management and hides detail financial data', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: contracts });
    loginAs('AGENT');
    renderPage();
    expect(await screen.findByText('Empresa A')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Novo contrato' }),
    ).not.toBeInTheDocument();
    vi.mocked(api.get).mockResolvedValue({ data: contracts[0] });
    fireEvent.click(screen.getAllByRole('button', { name: /Ver detalhes/ })[0]);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByText(/R\$/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Editar contrato' }),
    ).not.toBeInTheDocument();
  });

  it('searches by name or company when the search form is submitted', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [] });
    loginAs('ADMIN');
    renderPage();
    fireEvent.change(screen.getByLabelText('Pesquisar contratos'), {
      target: { value: ' Suporte ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Pesquisar' }));
    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith('/contracts', {
        params: { search: 'Suporte' },
      }),
    );
  });

  it('edits via the update command without turning zero into missing money', async () => {
    const zero = {
      ...contracts[0],
      name: 'Suporte',
      monthlyValue: 0,
      excessHourlyRateCents: 0,
    };
    vi.mocked(api.get).mockImplementation(async (url) => ({
      data:
        url === '/organizations'
          ? [{ id: 'org-1', name: 'Empresa A' }]
          : url === '/contracts/c1'
            ? zero
            : [zero],
    }));
    vi.mocked(api.post).mockResolvedValue({ data: zero });
    loginAs('ADMIN');
    renderPage();
    fireEvent.click(
      await screen.findByRole('button', { name: 'Ver detalhes Suporte' }),
    );
    fireEvent.click(
      await screen.findByRole('button', { name: 'Editar contrato' }),
    );
    await screen.findByRole('option', { name: 'Empresa A' });
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Salvar contrato' }),
      ).toBeEnabled(),
    );
    fireEvent.change(screen.getByLabelText('Nome do contrato'), {
      target: { value: 'Suporte atualizado' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar contrato' }));
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        '/contracts/c1/update',
        expect.objectContaining({
          name: 'Suporte atualizado',
          monthlyValue: 0,
          excessHourlyRateCents: 0,
        }),
      ),
    );
  });

  it('validates reversed dates before saving', async () => {
    vi.mocked(api.get).mockImplementation(async (url) => ({
      data:
        url === '/organizations' ? [{ id: 'org-1', name: 'Empresa A' }] : [],
    }));
    loginAs('ADMIN');
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Novo contrato' }));
    await screen.findByRole('option', { name: 'Empresa A' });
    fireEvent.change(screen.getByLabelText(/Empresa/), {
      target: { value: 'org-1' },
    });
    fireEvent.change(screen.getByLabelText('Início da vigência'), {
      target: { value: '2026-10-15' },
    });
    fireEvent.change(screen.getByLabelText('Fim da vigência'), {
      target: { value: '2026-10-14' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar contrato' }));
    expect(
      await screen.findByText(
        'O fim da vigência deve ser igual ou posterior ao início.',
      ),
    ).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });
});
