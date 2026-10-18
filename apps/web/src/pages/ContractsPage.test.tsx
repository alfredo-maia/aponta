import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { ContractsPage } from './ContractsPage';

vi.mock('../lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
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
    // The filter/screen-config tests below exercise useUserScreenConfig's
    // localStorage-backed saved filters; keep each test isolated.
    localStorage.clear();
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
    fireEvent.click(await screen.findByRole('button', { name: 'Novo contrato' }));
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
    expect(await screen.findByText('Mesas cobertas')).toBeInTheDocument();
    expect(screen.queryByText(/R\$/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Editar contrato' }),
    ).not.toBeInTheDocument();
  });

  it('opens a contract\'s detail as a full page (no dialog) and returns to the list via the back button', async () => {
    vi.mocked(api.get).mockImplementation(async (url) => ({
      data: url === '/contracts/c1' ? contracts[0] : contracts,
    }));
    loginAs('ADMIN');
    renderPage();

    await screen.findByText('Empresa A');
    fireEvent.click(screen.getAllByRole('button', { name: /Ver detalhes/ })[0]);

    expect(await screen.findByText('Mesas cobertas')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Editar contrato' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTitle('Voltar'));

    await waitFor(() => {
      expect(screen.queryByText('Mesas cobertas')).not.toBeInTheDocument();
      expect(screen.getByText('Empresa A')).toBeInTheDocument();
      expect(screen.getByText('Empresa B')).toBeInTheDocument();
    });
  });

  it('navigates between contracts using the toolbar Anterior/Próximo buttons', async () => {
    vi.mocked(api.get).mockImplementation(async (url) => {
      if (url === '/contracts/c1') return { data: contracts[0] };
      if (url === '/contracts/c2') return { data: contracts[1] };
      return { data: contracts };
    });
    loginAs('ADMIN');
    renderPage();

    await screen.findByText('Empresa A');
    fireEvent.click(screen.getAllByRole('button', { name: /Ver detalhes/ })[0]);

    await waitFor(() => {
      expect(screen.getByTestId('ez-toolbar-record-count')).toHaveTextContent(
        '1 de 2',
      );
    });
    expect(screen.getByTestId('ez-toolbar-previous-button')).toBeDisabled();
    expect(screen.getByTestId('ez-toolbar-next-button')).toBeEnabled();

    fireEvent.click(screen.getByTestId('ez-toolbar-next-button'));
    await waitFor(() => {
      expect(screen.getByTestId('ez-toolbar-record-count')).toHaveTextContent(
        '2 de 2',
      );
    });
    expect(screen.getByText('Empresa B')).toBeInTheDocument();
    expect(screen.getByTestId('ez-toolbar-next-button')).toBeDisabled();

    fireEvent.click(screen.getByTestId('ez-toolbar-previous-button'));
    await waitFor(() => {
      expect(screen.getByTestId('ez-toolbar-record-count')).toHaveTextContent(
        '1 de 2',
      );
    });
    expect(screen.getByText('Empresa A')).toBeInTheDocument();
  });

  it('shows a dedicated "Novo contrato" button directly on the toolbar for ADMIN, opening the full-page form', async () => {
    vi.mocked(api.get).mockImplementation(async (url) => ({
      data: url === '/organizations' ? [] : contracts,
    }));
    loginAs('ADMIN');
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Empresa A')).toBeInTheDocument();
    });

    const insertButton = screen.getByRole('button', { name: 'Novo contrato' });
    expect(insertButton).toBeInTheDocument();
    fireEvent.click(insertButton);

    // Full-page form (Sankhya "Modo Formulário") — no modal/dialog anymore.
    expect(await screen.findByLabelText('Nome do contrato')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByTitle('Voltar')).toBeInTheDocument();

    fireEvent.click(screen.getByTitle('Voltar'));
    await waitFor(() => {
      expect(screen.queryByLabelText('Nome do contrato')).not.toBeInTheDocument();
      expect(screen.getByText('Empresa A')).toBeInTheDocument();
    });
  });

  it('lets an ADMIN select a contract and delete it via the toolbar', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: contracts });
    vi.mocked(api.delete).mockResolvedValue({ data: {} });
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    loginAs('ADMIN');
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Empresa A');
    const rowCheckboxes = screen.getAllByRole('checkbox');
    // rowCheckboxes[0] is the header "select all" checkbox; [1] is the
    // first data row (contract c1).
    await user.click(rowCheckboxes[1]);

    expect(screen.getByTestId('ez-toolbar-delete-button')).toBeEnabled();
    await user.click(screen.getByTestId('ez-toolbar-delete-button'));

    expect(confirmSpy).toHaveBeenCalled();
    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/contracts/c1');
    });

    confirmSpy.mockRestore();
  });

  it('shows the backend conflict message when deleting a contract with worklogs fails', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: contracts });
    vi.mocked(api.delete).mockRejectedValue({
      response: {
        data: {
          message:
            'Contrato com apontamentos não pode ser excluído; desative-o para preservar o histórico',
        },
      },
    });
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    loginAs('ADMIN');
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Empresa A');
    const rowCheckboxes = screen.getAllByRole('checkbox');
    await user.click(rowCheckboxes[1]);
    await user.click(screen.getByTestId('ez-toolbar-delete-button'));

    expect(
      await screen.findByText(
        'Contrato com apontamentos não pode ser excluído; desative-o para preservar o histórico',
      ),
    ).toBeInTheDocument();

    confirmSpy.mockRestore();
  });

  it('does not show the delete button for AGENT, who cannot manage contracts', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: contracts });
    loginAs('AGENT');
    renderPage();

    await screen.findByText('Empresa A');
    expect(
      screen.queryByRole('button', { name: 'Excluir' }),
    ).not.toBeInTheDocument();
  });

  it('renders the Sankhya standard filter drawer and screen config modal (parity with Clientes)', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: contracts });
    loginAs('ADMIN');
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Empresa A');

    expect(screen.getByTestId('ez-toolbar-filter-panel-button')).toBeInTheDocument();
    expect(screen.getByTestId('ez-toolbar-screen-config-button')).toBeInTheDocument();

    await user.click(screen.getByTestId('ez-toolbar-filter-panel-button'));
    const drawer = screen.getByTestId('ez-filter-drawer');
    expect(within(drawer).getByText('Filtros de Contratos')).toBeInTheDocument();
    expect(
      within(drawer).getByLabelText(/buscar contrato\/empresa/i),
    ).toBeInTheDocument();
    expect(within(drawer).getByLabelText(/^status$/i)).toBeInTheDocument();

    await user.click(screen.getByTestId('ez-toolbar-screen-config-button'));
    const modal = screen.getByTestId('ez-entity-screen-config-modal');
    expect(
      within(modal).getByText('Personalização da Tela (Usuário)'),
    ).toBeInTheDocument();
    expect(within(modal).getByText('Contrato')).toBeInTheDocument();
  });

  it('filters contracts by name or company on the client side via the filter drawer', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: contracts });
    loginAs('ADMIN');
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Empresa A');
    expect(screen.getByText('Empresa B')).toBeInTheDocument();

    await user.click(screen.getByTestId('ez-toolbar-filter-panel-button'));
    const drawer = screen.getByTestId('ez-filter-drawer');

    await user.type(
      within(drawer).getByLabelText(/buscar contrato\/empresa/i),
      'Empresa A',
    );
    expect(screen.getByText('Empresa A')).toBeInTheDocument();
    expect(screen.queryByText('Empresa B')).not.toBeInTheDocument();

    // No server-side search should ever be issued: only the initial load.
    expect(api.get).toHaveBeenCalledWith('/contracts', { params: undefined });
    expect(api.get).not.toHaveBeenCalledWith(
      '/contracts',
      expect.objectContaining({ params: { search: expect.anything() } }),
    );

    await user.click(screen.getByTestId('ez-filter-drawer-clear'));
    expect(screen.getByText('Empresa A')).toBeInTheDocument();
    expect(screen.getByText('Empresa B')).toBeInTheDocument();
  });

  it('filters contracts by status (Ativo/Inativo) via the filter drawer', async () => {
    const statusContracts = [
      { ...contracts[0], active: true },
      { ...contracts[1], active: false },
    ];
    vi.mocked(api.get).mockResolvedValue({ data: statusContracts });
    loginAs('ADMIN');
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Empresa A');
    expect(screen.getByText('Empresa B')).toBeInTheDocument();

    await user.click(screen.getByTestId('ez-toolbar-filter-panel-button'));
    const drawer = screen.getByTestId('ez-filter-drawer');

    await user.selectOptions(
      within(drawer).getByLabelText(/^status$/i),
      'INACTIVE',
    );
    expect(screen.queryByText('Empresa A')).not.toBeInTheDocument();
    expect(screen.getByText('Empresa B')).toBeInTheDocument();

    await user.selectOptions(within(drawer).getByLabelText(/^status$/i), 'ALL');
    expect(screen.getByText('Empresa A')).toBeInTheDocument();
    expect(screen.getByText('Empresa B')).toBeInTheDocument();
  });

  it('filters dynamically by modality using the rule builder (Sankhya Filtros parity)', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: contracts });
    loginAs('ADMIN');
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Empresa A');
    expect(screen.getByText('Empresa B')).toBeInTheDocument();

    await user.click(screen.getByTestId('ez-toolbar-filter-panel-button'));
    const drawer = screen.getByTestId('ez-filter-drawer');
    await user.click(within(drawer).getByTestId('ez-dynamic-filter-add'));

    const rule = within(drawer).getByTestId('ez-dynamic-filter-rule');
    await user.selectOptions(within(rule).getByLabelText('Campo'), 'modality');
    await user.selectOptions(within(rule).getByLabelText('Valor'), 'Cobertura');

    expect(screen.queryByText('Empresa A')).not.toBeInTheDocument();
    expect(screen.getByText('Empresa B')).toBeInTheDocument();

    await user.click(screen.getByTestId('ez-filter-drawer-clear'));
    expect(screen.getByText('Empresa A')).toBeInTheDocument();
  });

  it('saves, applies, and deletes a saved filter from the drawer (Sankhya saved filters parity)', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: contracts });
    loginAs('ADMIN');
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Empresa A');

    await user.click(screen.getByTestId('ez-toolbar-filter-panel-button'));
    const drawer = screen.getByTestId('ez-filter-drawer');

    await user.type(
      within(drawer).getByLabelText(/buscar contrato\/empresa/i),
      'Empresa A',
    );
    await user.click(within(drawer).getByTestId('ez-filter-drawer-save-btn'));
    await user.type(
      within(drawer).getByTestId('ez-filter-drawer-name-input'),
      'Só Empresa A',
    );
    await user.click(within(drawer).getByTestId('ez-filter-drawer-confirm-save'));

    const savedList = await within(drawer).findByTestId(
      'ez-filter-drawer-saved-list',
    );
    expect(within(savedList).getByText('Só Empresa A')).toBeInTheDocument();

    await user.clear(within(drawer).getByLabelText(/buscar contrato\/empresa/i));
    expect(screen.getByText('Empresa B')).toBeInTheDocument();

    await user.click(within(savedList).getByText('Só Empresa A'));
    expect(
      within(drawer).getByLabelText(/buscar contrato\/empresa/i),
    ).toHaveValue('Empresa A');
    expect(screen.queryByText('Empresa B')).not.toBeInTheDocument();

    await user.click(
      within(savedList).getByLabelText(/excluir filtro só empresa a/i),
    );
    expect(within(savedList).queryByText('Só Empresa A')).not.toBeInTheDocument();
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
    fireEvent.click(await screen.findByRole('button', { name: 'Novo contrato' }));
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
