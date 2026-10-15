import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
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
  { id: 'sd-1', name: 'Suporte N1', createdAt: '2026-09-29T10:00:00.000Z' },
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
    expect(screen.queryByLabelText(/^nome$/i)).not.toBeInTheDocument();

    await user.click(screen.getByTestId('ez-toolbar-insert-button'));

    await user.type(await screen.findByLabelText(/^nome$/i), 'Financeiro');
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
});
