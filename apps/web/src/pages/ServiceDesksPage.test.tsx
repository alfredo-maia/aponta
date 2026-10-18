import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { ServiceDesksPage } from './ServiceDesksPage';

vi.mock('../lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const serviceDesks = [
  {
    id: 'sd-1',
    name: 'Suporte N1',
    createdAt: '2026-09-29T10:00:00.000Z',
    ticketSections: [
      { id: 's1', key: 'GENERAL_INFO', enabled: true, sortOrder: 0 },
      { id: 's2', key: 'WORKLOGS', enabled: true, sortOrder: 1 },
    ],
  },
  { id: 'sd-2', name: 'Infraestrutura', createdAt: '2026-09-29T10:00:00.000Z' },
];

const organizations = [{ id: 'org-1', name: 'Acme Ltda' }];

function mockApiGet() {
  vi.mocked(api.get).mockImplementation((url: string) => {
    if (url === '/service-desks') {
      return Promise.resolve({ data: serviceDesks });
    }
    if (url === '/organizations') {
      return Promise.resolve({ data: organizations });
    }
    if (url === '/users/agents') {
      return Promise.resolve({ data: [] });
    }
    if (String(url).includes('/stages')) {
      return Promise.resolve({
        data: [
          {
            id: 'st-1',
            name: 'Pendente',
            position: 0,
            isInitial: true,
            isFinal: false,
            transitionToIds: [],
          },
        ],
      });
    }
    return Promise.reject(new Error(`Unexpected GET ${url}`));
  });
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/service-desks']}>
        <Routes>
          <Route path="/service-desks" element={<ServiceDesksPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function loginAs(role: 'ADMIN' | 'AGENT' | 'CLIENT') {
  // Same decode-free shortcut the rest of the web suite uses: set the
  // store's `user` directly rather than crafting a real JWT, since the
  // page only reads `useAuthStore` state, never decodes a token itself.
  useAuthStore.setState({
    token: 'fake-token',
    user: { sub: 'u-1', email: 'admin@aponta.com', role },
  });
}

describe('ServiceDesksPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiGet();
    useAuthStore.setState({ token: null, user: null });
  });

  it('should list existing service desks for an ADMIN user', async () => {
    loginAs('ADMIN');
    renderPage();

    expect(await screen.findByText('Suporte N1')).toBeInTheDocument();
    expect(screen.getByText('Infraestrutura')).toBeInTheDocument();
    expect(screen.getByTestId('ez-entity-grid-pagination-count')).toHaveTextContent('1-2 de 2');
    expect(screen.getByLabelText(/linhas por página/i)).toBeInTheDocument();
  });

  it('should show the Sankhya-standard entity toolbar with Incluir, Recarregar, and column config', async () => {
    loginAs('ADMIN');
    renderPage();
    await screen.findByText('Suporte N1');

    expect(screen.getByTestId('ez-entity-toolbar')).toBeInTheDocument();
    expect(screen.getByTestId('ez-toolbar-insert-button')).toBeInTheDocument();
    expect(screen.getByTestId('ez-toolbar-refresh-button')).toBeInTheDocument();
    expect(screen.getByTestId('ez-toolbar-screen-config-button')).toBeInTheDocument();

    // Delete and Duplicate are present but disabled until a row is selected.
    expect(screen.getByTestId('ez-toolbar-delete-button')).toBeDisabled();
    expect(screen.getByTestId('ez-toolbar-clone-button')).toBeDisabled();
  });

  it('should enable Excluir and Duplicar once a row is selected, and call the delete endpoint on confirmation', async () => {
    loginAs('ADMIN');
    const user = userEvent.setup();
    vi.mocked(api.delete).mockResolvedValue({ data: {} });
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderPage();
    await screen.findByText('Suporte N1');

    const rowCheckboxes = screen.getAllByRole('checkbox');
    // First checkbox in the grid body belongs to the "Suporte N1" row.
    await user.click(rowCheckboxes[1]);

    expect(screen.getByTestId('ez-toolbar-delete-button')).toBeEnabled();
    expect(screen.getByTestId('ez-toolbar-clone-button')).toBeEnabled();

    await user.click(screen.getByTestId('ez-toolbar-delete-button'));

    expect(confirmSpy).toHaveBeenCalled();
    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/service-desks/sd-1');
    });

    confirmSpy.mockRestore();
  });

  it('should open the create form only after clicking Incluir, and create a new service desk', async () => {
    loginAs('ADMIN');
    const user = userEvent.setup();
    const created = {
      id: 'sd-3',
      name: 'Financeiro',
      createdAt: '2026-09-30T10:00:00.000Z',
    };
    vi.mocked(api.post).mockResolvedValue({ data: created });

    renderPage();
    await screen.findByText('Suporte N1');

    // The create form is not shown until the user explicitly asks for it.
    expect(screen.queryByLabelText(/^nome \*?$/i)).not.toBeInTheDocument();

    await user.click(screen.getByTestId('ez-toolbar-insert-button'));

    const nameInput = await screen.findByRole('textbox', { name: /^nome \*$/i });
    await user.type(nameInput, 'Financeiro');
    await user.click(screen.getByRole('button', { name: /criar/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/service-desks', {
        name: 'Financeiro',
      });
    });
  });

  it('should not submit when the name field is empty', async () => {
    loginAs('ADMIN');
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Suporte N1');

    await user.click(screen.getByTestId('ez-toolbar-insert-button'));
    await user.click(screen.getByRole('button', { name: /criar/i }));

    expect(await screen.findByText(/nome é obrigatório/i)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('should show an access-denied message for a non-ADMIN user', () => {
    loginAs('CLIENT');
    renderPage();

    expect(
      screen.getByText(/não tem permissão/i),
    ).toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalled();
  });

  it('shows Portuguese labels for ticket sections instead of database keys', async () => {
    loginAs('ADMIN');
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Suporte N1');
    await user.click(screen.getByText('Suporte N1'));
    await user.click(await screen.findByRole('tab', { name: 'Seções do ticket' }));

    expect(await screen.findByLabelText('Informações gerais')).toBeInTheDocument();
    expect(screen.getByLabelText('Apontamentos')).toBeInTheDocument();
    expect(screen.queryByText('GENERAL_INFO')).not.toBeInTheDocument();
    expect(screen.queryByText('WORKLOGS')).not.toBeInTheDocument();
  });

  it('should link a service desk to a client and save its SLA overrides', async () => {
    loginAs('ADMIN');
    const user = userEvent.setup();
    vi.mocked(api.patch).mockResolvedValue({ data: {} });

    renderPage();
    await screen.findByText('Suporte N1');

    // The grid only shows a summary; opening the desk's name navigates
    // into the detail view (Sankhya "Modo Formulário") where the full
    // editors (incl. SLA) live.
    await user.click(screen.getByText('Suporte N1'));

    expect(await screen.findByRole('tab', { name: 'Informações básicas' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Parâmetros' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Estágio' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: /editar cliente e sla/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Clientes' }));
    const editSlaButton = await screen.findByRole('button', { name: /editar cliente e sla/i });
    await user.click(editSlaButton);

    const orgSelect = await screen.findByLabelText(/cliente vinculado/i);
    await user.selectOptions(orgSelect, 'org-1');

    const criticalResponseInput = screen.getByLabelText(/1ª resposta \(pad\. 1h\)/i);
    await user.clear(criticalResponseInput);
    await user.type(criticalResponseInput, '2');

    await user.click(screen.getByRole('button', { name: /salvar cliente e sla/i }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(
        '/service-desks/sd-1',
        expect.objectContaining({
          organizationId: 'org-1',
          slaCriticalResponseHours: 2,
        }),
      );
    });
  });

  it('shows the Sankhya-standard filter drawer with search, status and dynamic filter fields', async () => {
    loginAs('ADMIN');
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Suporte N1');

    expect(screen.getByTestId('ez-toolbar-filter-panel-button')).toBeInTheDocument();
    await user.click(screen.getByTestId('ez-toolbar-filter-panel-button'));

    const drawer = screen.getByTestId('ez-filter-drawer');
    expect(drawer).toBeInTheDocument();
    expect(screen.getByText('Filtros de Mesas')).toBeInTheDocument();
    expect(within(drawer).getByLabelText(/buscar mesa/i)).toBeInTheDocument();
    expect(within(drawer).getByLabelText(/^status$/i)).toBeInTheDocument();

    await user.click(screen.getByTestId('ez-filter-drawer-close'));
    expect(screen.queryByTestId('ez-filter-drawer')).not.toBeInTheDocument();
  });

  it('filters the grid by search text and status (Sankhya filter drawer)', async () => {
    const filterableDesks = [
      { id: 'sd-1', name: 'Suporte N1', active: true, createdAt: '2026-09-29T10:00:00.000Z' },
      { id: 'sd-2', name: 'Infraestrutura', active: false, createdAt: '2026-09-29T10:00:00.000Z' },
    ];
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/service-desks') return Promise.resolve({ data: filterableDesks });
      if (url === '/organizations') return Promise.resolve({ data: organizations });
      if (url === '/users/agents') return Promise.resolve({ data: [] });
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });

    loginAs('ADMIN');
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Suporte N1');
    expect(screen.getByText('Infraestrutura')).toBeInTheDocument();

    await user.click(screen.getByTestId('ez-toolbar-filter-panel-button'));
    const drawer = screen.getByTestId('ez-filter-drawer');

    // Search text narrows to the matching name only.
    await user.type(within(drawer).getByLabelText(/buscar mesa/i), 'Suporte');
    expect(screen.getByText('Suporte N1')).toBeInTheDocument();
    expect(screen.queryByText('Infraestrutura')).not.toBeInTheDocument();
    await user.clear(within(drawer).getByLabelText(/buscar mesa/i));

    // Status filter narrows to inactive desks only.
    await user.selectOptions(within(drawer).getByLabelText(/^status$/i), 'INACTIVE');
    expect(screen.queryByText('Suporte N1')).not.toBeInTheDocument();
    expect(screen.getByText('Infraestrutura')).toBeInTheDocument();

    // Clearing the drawer resets every filter back to showing both.
    await user.click(screen.getByTestId('ez-filter-drawer-clear'));
    expect(screen.getByText('Suporte N1')).toBeInTheDocument();
    expect(screen.getByText('Infraestrutura')).toBeInTheDocument();
  });

  it('filters dynamically by any column using the rule builder (Sankhya Filtros parity)', async () => {
    loginAs('ADMIN');
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Suporte N1');

    await user.click(screen.getByTestId('ez-toolbar-filter-panel-button'));
    const drawer = screen.getByTestId('ez-filter-drawer');
    await user.click(within(drawer).getByTestId('ez-dynamic-filter-add'));

    const rule = within(drawer).getByTestId('ez-dynamic-filter-rule');
    const fieldOptions = within(within(rule).getByLabelText('Campo'))
      .getAllByRole('option')
      .map((o) => o.textContent);
    expect(fieldOptions).toEqual(
      expect.arrayContaining(['Nome', 'Nome de exibição', 'Status', 'Recebendo', 'Agentes']),
    );

    await user.type(within(rule).getByLabelText('Valor'), 'Infraestrutura');
    expect(screen.queryByText('Suporte N1')).not.toBeInTheDocument();
    expect(screen.getByText('Infraestrutura')).toBeInTheDocument();

    await user.click(screen.getByTestId('ez-filter-drawer-clear'));
    expect(screen.getByText('Suporte N1')).toBeInTheDocument();
  });

  it('saves, applies, and deletes a saved filter from the drawer (Sankhya saved filters parity)', async () => {
    loginAs('ADMIN');
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Suporte N1');

    await user.click(screen.getByTestId('ez-toolbar-filter-panel-button'));
    const drawer = screen.getByTestId('ez-filter-drawer');

    await user.type(within(drawer).getByLabelText(/buscar mesa/i), 'Suporte');
    await user.click(within(drawer).getByTestId('ez-filter-drawer-save-btn'));
    await user.type(within(drawer).getByTestId('ez-filter-drawer-name-input'), 'Só Suporte');
    await user.click(within(drawer).getByTestId('ez-filter-drawer-confirm-save'));

    const savedList = await within(drawer).findByTestId('ez-filter-drawer-saved-list');
    expect(within(savedList).getByText('Só Suporte')).toBeInTheDocument();

    // Clear the live filter, then re-apply it from the saved entry.
    await user.clear(within(drawer).getByLabelText(/buscar mesa/i));
    await user.click(within(savedList).getByText('Só Suporte'));
    expect(within(drawer).getByLabelText(/buscar mesa/i)).toHaveValue('Suporte');

    // Delete the saved filter.
    await user.click(within(savedList).getByLabelText(/excluir filtro só suporte/i));
    expect(within(drawer).queryByText('Só Suporte')).not.toBeInTheDocument();
  });
});
