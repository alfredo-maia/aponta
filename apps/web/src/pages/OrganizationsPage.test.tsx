import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
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
    delete: vi.fn(),
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

const serviceDesks = [
  { id: 'desk-1', name: 'Avulso' },
  { id: 'desk-2', name: 'Contrato' },
];

const orgDetail = {
  id: 'org-1',
  name: 'Empresa A',
  legalName: 'Empresa A Ltda',
  cnpj: '19131243000197',
  cpf: null,
  documentType: 'CNPJ',
  municipalRegistration: '123',
  stateRegistration: '456',
  active: true,
  serviceType: null,
  healthStatus: null,
  workFolder: '/clientes/empresa-a',
  notes: 'Cliente VIP',
  visibleToClients: true,
  quarterlyBilling: false,
  users: [],
  addresses: [
    { id: 'addr-1', street: 'Av Paulista', city: 'Sao Paulo', state: 'SP', zipCode: '01310100', neighborhood: 'Bela Vista', complement: null },
  ],
  contacts: [
    { id: 'contact-1', name: 'Jane Doe', email: 'jane@example.com', phone: '11999999999', type: 'Financeiro' },
  ],
  serviceDesks: [{ id: 'desk-1', name: 'Avulso' }],
  agentGroups: [
    { id: 'group-1', name: 'Grupo Suporte', active: true, members: [{ id: 'u-3', name: 'Agente', email: 'agent@example.com' }] },
  ],
};

function mockApiGet() {
  vi.mocked(api.get).mockImplementation((url: string) => {
    if (url === '/organizations') return Promise.resolve({ data: orgs });
    if (url === '/users') return Promise.resolve({ data: users });
    if (url === '/service-desks') return Promise.resolve({ data: serviceDesks });
    if (url === '/organizations/org-1') return Promise.resolve({ data: orgDetail });
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

async function openDetail(user: ReturnType<typeof userEvent.setup>) {
  await waitFor(() => {
    expect(screen.getByText('Empresa A')).toBeInTheDocument();
  });
  await user.click(screen.getByRole('button', { name: 'Empresa A' }));
  await waitFor(() => {
    expect(screen.getByText('Empresa A Ltda')).toBeInTheDocument();
  });
}

describe('OrganizationsPage', { timeout: 15000 }, () => {
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

  it('shows the list view by default with a mode toggle (Tiflux/Sankhya-parity, issue #57)', async () => {
    loginAs('ADMIN');
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Empresa A')).toBeInTheDocument();
    });

    expect(screen.getByRole('columnheader', { name: 'Nome' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Status' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Clientes' })).toBeInTheDocument();

    const [rowA, rowB] = screen.getAllByRole('row').slice(1);
    expect(within(rowA).getByText('Empresa A')).toBeInTheDocument();
    expect(within(rowA).getByText('Ativo')).toBeInTheDocument();
    expect(within(rowA).getByText('2')).toBeInTheDocument();

    expect(within(rowB).getByText('Empresa B')).toBeInTheDocument();
    expect(within(rowB).getByText('0')).toBeInTheDocument();

    expect(screen.getByTitle(/modo lista/i)).toBeInTheDocument();
    expect(screen.getByTitle(/modo formulário/i)).toBeInTheDocument();
  });

  it('switches to the full-page form via "Novo Cliente" and validates it', async () => {
    loginAs('ADMIN');
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Empresa A')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /novo cliente/i }));

    await waitFor(() => {
      expect(screen.getByText('Nova Empresa')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /cadastrar/i }));

    await waitFor(() => {
      expect(screen.getByText(/nome é obrigatório/i)).toBeInTheDocument();
    });
    expect(api.post).not.toHaveBeenCalled();
  });

  it('creates a new organization with rich fields', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { id: 'org-3', name: 'Empresa C' } });
    loginAs('ADMIN');
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Empresa A')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /novo cliente/i }));
    await waitFor(() => {
      expect(screen.getByText('Nova Empresa')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/nome fantasia/i), 'Empresa C');
    await user.type(screen.getByLabelText(/razão social/i), 'Empresa C Ltda');
    await user.click(screen.getByRole('button', { name: /cadastrar/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/organizations', expect.objectContaining({
        name: 'Empresa C',
        legalName: 'Empresa C Ltda',
      }));
    });
  });

  it('looks up a CNPJ and autofills legal name / trade name', async () => {
    vi.mocked(api.get).mockImplementation((url: string, config?: any) => {
      if (url === '/organizations') return Promise.resolve({ data: orgs });
      if (url === '/organizations/cnpj-lookup') {
        expect(config?.params?.cnpj).toBe('19131243000197');
        return Promise.resolve({
          data: {
            cnpj: '19131243000197',
            legalName: 'Empresa Teste LTDA',
            tradeName: 'Teste',
            address: { zipCode: null, street: null, neighborhood: null, city: null, state: null, complement: null },
          },
        });
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });
    loginAs('ADMIN');
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Empresa A')).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /novo cliente/i }));
    await waitFor(() => {
      expect(screen.getByText('Nova Empresa')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/cnpj/i), '19131243000197');
    await user.click(screen.getByRole('button', { name: /buscar cnpj/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/razão social/i)).toHaveValue('Empresa Teste LTDA');
    });
    expect(screen.getByLabelText(/nome fantasia/i)).toHaveValue('Teste');
  });

  it('toggles CPF/CNPJ fields based on document type (Tiflux-parity, issue #56)', async () => {
    loginAs('ADMIN');
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Empresa A')).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /novo cliente/i }));
    await waitFor(() => {
      expect(screen.getByText('Nova Empresa')).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/^cnpj$/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^cpf$/i)).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/tipo de documento/i), 'CPF');

    expect(screen.getByLabelText(/^cpf$/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^cnpj$/i)).not.toBeInTheDocument();
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

    // Regressão: a grade (EzEntityGrid) não deve renderizar seu próprio
    // estado vazio ao mesmo tempo que o EzEmptyCard da página — só um
    // estado de "lista vazia" deve aparecer por vez.
    expect(screen.queryByText(/nenhum registro encontrado/i)).not.toBeInTheDocument();
  });

  it('opens the full-page detail with the Tiflux-parity 3-column panel', async () => {
    loginAs('ADMIN');
    const user = userEvent.setup();
    renderPage();

    await openDetail(user);

    expect(screen.getByText('19.131.243/0001-97')).toBeInTheDocument();
    expect(screen.getByText('/clientes/empresa-a')).toBeInTheDocument();
    expect(screen.getByText('Cliente VIP')).toBeInTheDocument();
    expect(screen.getByLabelText(/visível para clientes/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/faturamento quarteirizado/i)).toBeInTheDocument();
  });

  it('shows the "Cliente ativo" toggle and inactivates the organization', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: { ...orgDetail, active: false } });
    loginAs('ADMIN');
    const user = userEvent.setup();
    renderPage();

    await openDetail(user);

    const toggle = screen.getByLabelText(/cliente ativo/i);
    await user.click(toggle);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/organizations/org-1', { active: false });
    });
  });

  it('defaults to the Usuários tab, lists only CLIENT/CLIENT_MASTER users and allows linking', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: {} });
    loginAs('ADMIN');
    const user = userEvent.setup();
    renderPage();

    await openDetail(user);

    await waitFor(() => {
      expect(screen.getByText('Cliente Um')).toBeInTheDocument();
    });
    expect(screen.getByText('Cliente Dois')).toBeInTheDocument();
    expect(screen.queryByText('Agente')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Adicionar' }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/users/u-2', { organizationId: 'org-1' });
    });
  });

  it('adds a new contact from the Usuários tab', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { id: 'contact-2', name: 'New Contact' } });
    loginAs('ADMIN');
    const user = userEvent.setup();
    renderPage();

    await openDetail(user);

    await waitFor(() => {
      expect(screen.getByText(/Jane Doe/)).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/^nome$/i), 'New Contact');
    await user.click(screen.getByRole('button', { name: /adicionar contato/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/organizations/org-1/contacts', expect.objectContaining({
        name: 'New Contact',
      }));
    });
  });

  it('saves serviceType/healthStatus from the Usuários tab (Perfil do Cliente, issue #56)', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: orgDetail });
    loginAs('ADMIN');
    const user = userEvent.setup();
    renderPage();

    await openDetail(user);

    await waitFor(() => {
      expect(screen.getByLabelText(/tipo de atendimento/i)).toBeInTheDocument();
    });

    await user.selectOptions(screen.getByLabelText(/tipo de atendimento/i), 'SUPORTE');
    await user.selectOptions(screen.getByLabelText(/^saúde$/i), 'SAUDAVEL');
    await user.click(screen.getByRole('button', { name: /salvar perfil/i }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/organizations/org-1', {
        serviceType: 'SUPORTE',
        healthStatus: 'SAUDAVEL',
      });
    });
  });

  it('shows an honest stub in the Recursos tab (no fabricated module)', async () => {
    loginAs('ADMIN');
    const user = userEvent.setup();
    renderPage();

    await openDetail(user);

    await user.click(screen.getByRole('tab', { name: /recursos/i }));

    await waitFor(() => {
      expect(screen.getByText(/nenhum recurso cadastrado/i)).toBeInTheDocument();
    });
  });

  it('manages Mesas (N:N) and Grupo de Atendentes in the Relacionamentos tab (Tiflux-parity, issue #57)', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} });
    vi.mocked(api.delete).mockResolvedValue({ data: {} });
    loginAs('ADMIN');
    const user = userEvent.setup();
    renderPage();

    await openDetail(user);

    await user.click(screen.getByRole('tab', { name: /relacionamentos/i }));

    await waitFor(() => {
      expect(screen.getByText('Avulso')).toBeInTheDocument();
    });
    expect(screen.getByText('Grupo Suporte')).toBeInTheDocument();

    // Vincula uma nova mesa (apenas "Contrato" está disponível, pois "Avulso" já está vinculada)
    await user.selectOptions(screen.getByLabelText(/adicionar mesa de serviço/i), 'desk-2');
    await user.click(screen.getByRole('button', { name: /^vincular$/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/organizations/org-1/service-desks/desk-2');
    });

    // Desvincula a mesa existente
    await user.click(screen.getByRole('button', { name: /desvincular/i }));
    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/organizations/org-1/service-desks/desk-1');
    });

    // Cria um novo grupo de atendentes
    await user.type(screen.getByLabelText(/nome do grupo/i), 'Grupo Vendas');
    await user.click(screen.getByRole('button', { name: /adicionar grupo de atendentes/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/organizations/org-1/agent-groups', expect.objectContaining({
        name: 'Grupo Vendas',
      }));
    });
  });

  it('renders billing preferences and updates quarterly billing in Faturamento tab (issue #58)', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: { ...orgDetail, quarterlyBilling: true } });
    loginAs('ADMIN');
    const user = userEvent.setup();
    renderPage();

    await openDetail(user);

    await user.click(screen.getByRole('tab', { name: /faturamento/i }));

    const billingContent = screen.getByTestId('org-billing-tab-content');
    expect(billingContent).toBeInTheDocument();

    const quarterlyToggle = within(billingContent).getByLabelText(/habilitar faturamento quarteirizado/i);
    expect(quarterlyToggle).toBeInTheDocument();
    expect(within(billingContent).getByLabelText(/e-mails para envio de cobrança/i)).toBeInTheDocument();
    expect(within(billingContent).getByLabelText(/dia de vencimento/i)).toBeInTheDocument();
    expect(within(billingContent).getByLabelText(/forma de pagamento/i)).toBeInTheDocument();
    expect(within(billingContent).getByLabelText(/instruções e observações/i)).toBeInTheDocument();

    // Toggle quarterly billing
    await user.click(quarterlyToggle);

    // Save preferences
    await user.click(within(billingContent).getByRole('button', { name: /salvar preferências/i }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(
        '/organizations/org-1',
        expect.objectContaining({
          quarterlyBilling: true,
        }),
      );
    });
  });

  it('groups organizations by status (Ativo/Inativo) when "Agrupar por status" is toggled on', async () => {
    loginAs('ADMIN');
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Empresa A')).toBeInTheDocument();
    });

    // Flat by default: no group header rows, both orgs visible as leaf rows.
    expect(screen.queryByTestId('ez-entity-grid-group-row')).not.toBeInTheDocument();

    await user.click(screen.getByLabelText(/agrupar por status/i));

    const groupRows = await screen.findAllByTestId('ez-entity-grid-group-row');
    expect(groupRows).toHaveLength(1); // both orgs are active -> single "Ativo" group
    expect(groupRows[0]).toHaveTextContent('Ativo');
    expect(screen.queryByText('Empresa A')).not.toBeInTheDocument();

    await user.click(groupRows[0]);
    expect(screen.getByText('Empresa A')).toBeInTheDocument();
    expect(screen.getByText('Empresa B')).toBeInTheDocument();

    // Toggling off returns to the flat view.
    await user.click(screen.getByLabelText(/agrupar por status/i));
    expect(screen.queryByTestId('ez-entity-grid-group-row')).not.toBeInTheDocument();
    expect(screen.getByText('Empresa A')).toBeInTheDocument();
  });

  it('renders Sankhya standard entity toolbar, filter drawer, and screen config modal (br.com.sankhya.core.cad.parceiros parity)', async () => {
    loginAs('ADMIN');
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Empresa A')).toBeInTheDocument();
    });

    // 1. Toolbar Sankhya is rendered with standard controls
    expect(screen.getByTestId('ez-entity-toolbar')).toBeInTheDocument();
    expect(screen.getByTestId('ez-toolbar-filter-panel-button')).toBeInTheDocument();
    expect(screen.getByTestId('ez-toolbar-mode-toggle-button')).toBeInTheDocument();
    expect(screen.getByTestId('ez-toolbar-insert-button')).toBeInTheDocument();
    expect(screen.getByTestId('ez-toolbar-refresh-button')).toBeInTheDocument();
    expect(screen.getByTestId('ez-toolbar-screen-config-button')).toBeInTheDocument();

    // 2. Open and test Filter Drawer
    await user.click(screen.getByTestId('ez-toolbar-filter-panel-button'));
    const drawer = screen.getByTestId('ez-filter-drawer');
    expect(drawer).toBeInTheDocument();
    expect(screen.getByText('Filtros de Clientes')).toBeInTheDocument();
    expect(within(drawer).getByLabelText(/buscar parceiro/i)).toBeInTheDocument();
    expect(within(drawer).getByLabelText(/^status$/i)).toBeInTheDocument();
    expect(within(drawer).getByLabelText(/tipo de documento/i)).toBeInTheDocument();

    // Close drawer
    await user.click(screen.getByTestId('ez-filter-drawer-close'));
    expect(screen.queryByTestId('ez-filter-drawer')).not.toBeInTheDocument();

    // 3. Open and test Screen Configuration Modal (Per-User Personalization)
    await user.click(screen.getByTestId('ez-toolbar-screen-config-button'));
    const modal = screen.getByTestId('ez-entity-screen-config-modal');
    expect(modal).toBeInTheDocument();
    expect(within(modal).getByText('Personalização da Tela (Usuário)')).toBeInTheDocument();
    expect(within(modal).getByText('Razão Social')).toBeInTheDocument();
    expect(within(modal).getByText('Densidade das Linhas')).toBeInTheDocument();

    // Close modal
    await user.click(within(modal).getByLabelText('Fechar'));
    expect(screen.queryByTestId('ez-entity-screen-config-modal')).not.toBeInTheDocument();
  });
});
