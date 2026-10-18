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
  await user.click(screen.getByRole('button', { name: /abrir cadastro de empresa a/i }));
  await waitFor(() => {
    expect(screen.getByText('Empresa A Ltda')).toBeInTheDocument();
  });
}

describe('OrganizationsPage', { timeout: 15000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiGet();
    useAuthStore.setState({ token: null, user: null });
    // A couple of tests below exercise useUserScreenConfig's localStorage
    // persistence; keep each test's screen-config state isolated so test
    // order never matters.
    localStorage.clear();
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

    // Botão "Novo Cliente" continua removido a pedido (criação só via
    // Ações > Cadastrar manualmente); o alternador Grade/Formulário, porém,
    // deve ficar visível (padrão igual a Mesas e Contratos).
    expect(screen.getByTestId('ez-toolbar-mode-toggle-button')).toBeInTheDocument();
    expect(screen.queryByTestId('ez-toolbar-insert-button')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /novo cliente/i })).not.toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Código' })).toBeInTheDocument();
  });

  it('switches to the full-page form via Ações > Cadastrar manualmente and validates it', async () => {
    loginAs('ADMIN');
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Empresa A')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('ez-toolbar-actions-button'));
    await user.click(screen.getByRole('menuitem', { name: /cadastrar manualmente/i }));

    await waitFor(() => {
      expect(screen.getByText('Nova Empresa')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /cadastrar/i }));

    await waitFor(() => {
      expect(screen.getByText(/nome é obrigatório/i)).toBeInTheDocument();
    });
    expect(api.post).not.toHaveBeenCalled();
  });

  it('switches between Grid Mode and Form Mode via the toolbar toggle', async () => {
    loginAs('ADMIN');
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Empresa A')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('ez-toolbar-mode-toggle-button'));

    await waitFor(() => {
      expect(screen.getByText('Empresa A Ltda')).toBeInTheDocument();
    });

    await user.click(screen.getByTitle('Voltar'));

    await waitFor(() => {
      expect(screen.getByRole('columnheader', { name: 'Nome' })).toBeInTheDocument();
    });
  });

  it('creates a new organization with rich fields', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { id: 'org-3', name: 'Empresa C' } });
    loginAs('ADMIN');
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Empresa A')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('ez-toolbar-actions-button'));
    await user.click(screen.getByRole('menuitem', { name: /cadastrar manualmente/i }));
    await waitFor(() => {
      expect(screen.getByText('Nova Empresa')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/nome fantasia/i), 'Empresa C');
    await user.type(screen.getByLabelText(/razão social/i), 'Empresa C Ltda');
    await user.click(screen.getByLabelText(/faturamento quarteirizado/i));
    await user.type(screen.getByLabelText(/e-mails de faturamento/i), 'financeiro@empresac.com');
    await user.type(screen.getByLabelText(/dia de vencimento/i), '15');
    await user.click(screen.getByRole('button', { name: /cadastrar/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/organizations', expect.objectContaining({
        name: 'Empresa C',
        legalName: 'Empresa C Ltda',
        quarterlyBilling: true,
        billingEmails: 'financeiro@empresac.com',
        billingDueDay: 15,
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
    await user.click(screen.getByTestId('ez-toolbar-actions-button'));
    await user.click(screen.getByRole('menuitem', { name: /cadastrar manualmente/i }));
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
    await user.click(screen.getByTestId('ez-toolbar-actions-button'));
    await user.click(screen.getByRole('menuitem', { name: /cadastrar manualmente/i }));
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

    await user.click(screen.getByRole('button', { name: 'Remover' }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/users/u-1', { organizationId: null });
    });
  });

  it('updates organization name and legal name on blur in Usuários tab', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: orgDetail });
    loginAs('ADMIN');
    const user = userEvent.setup();
    renderPage();

    await openDetail(user);

    const legalNameInput = screen.getByLabelText(/razão social/i);
    await user.clear(legalNameInput);
    await user.type(legalNameInput, 'Empresa A Nova Razao');
    await user.tab();

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/organizations/org-1', { legalName: 'Empresa A Nova Razao' });
    });

    const nameInput = screen.getByLabelText(/nome fantasia/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'Empresa A Novo Nome');
    await user.tab();

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/organizations/org-1', { name: 'Empresa A Novo Nome' });
    });
  });

  it('toggles visibility and quarterly billing from the detail header', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: orgDetail });
    loginAs('ADMIN');
    const user = userEvent.setup();
    renderPage();

    await openDetail(user);

    await user.click(screen.getByLabelText(/visível para clientes/i));
    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/organizations/org-1', { visibleToClients: false });
    });

    await user.click(screen.getByLabelText(/faturamento quarteirizado/i));
    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/organizations/org-1', { quarterlyBilling: true });
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

    // Fill in billing inputs
    await user.type(within(billingContent).getByLabelText(/e-mails para envio de cobrança/i), 'cobranca@empresa.com');
    await user.type(within(billingContent).getByLabelText(/dia de vencimento/i), '20');
    await user.selectOptions(within(billingContent).getByLabelText(/forma de pagamento/i), 'PIX');
    await user.type(within(billingContent).getByLabelText(/instruções e observações/i), 'Nota no 1o dia útil');

    // Save preferences
    await user.click(within(billingContent).getByRole('button', { name: /salvar preferências/i }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(
        '/organizations/org-1',
        expect.objectContaining({
          quarterlyBilling: true,
          billingEmails: 'cobranca@empresa.com',
          billingDueDay: 20,
          billingMethod: 'PIX',
          billingNotes: 'Nota no 1o dia útil',
        }),
      );
    });
  });

  it('supports inline editing of cells and Cadastrar por CNPJ via toolbar actions (Sankhya parity)', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: { id: 'org-1', active: false } });
    vi.mocked(api.get).mockImplementation((url: string, config?: any) => {
      if (url === '/organizations') return Promise.resolve({ data: orgs });
      if (url === '/organizations/cnpj-lookup') {
        return Promise.resolve({
          data: {
            cnpj: '19131243000197',
            legalName: 'Parceiro CNPJ S/A',
            tradeName: 'Parceiro CNPJ',
            address: { zipCode: '01310100', street: 'Av Paulista', neighborhood: 'Bela Vista', city: 'SP', state: 'SP', complement: null },
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

    // 1. Inline edit: toggle status directly from the grid cell
    const statusButtons = screen.getAllByTitle(/alternar status/i);
    expect(statusButtons.length).toBeGreaterThan(0);
    await user.click(statusButtons[0]);
    expect(api.patch).toHaveBeenCalledWith('/organizations/org-1', { active: false });

    // 2. Toolbar action: Cadastrar por CNPJ
    await user.click(screen.getByTestId('ez-toolbar-actions-button'));
    await user.click(screen.getByRole('menuitem', { name: /cadastrar por cnpj/i }));

    expect(screen.getByText('Cadastrar Parceiro por CNPJ')).toBeInTheDocument();
    await user.type(screen.getByLabelText(/cnpj/i), '19131243000197');
    await user.click(screen.getByRole('button', { name: /consultar e abrir cadastro/i }));

    await waitFor(() => {
      expect(screen.getByText('Nova Empresa')).toBeInTheDocument();
      expect(screen.getByLabelText(/razão social/i)).toHaveValue('Parceiro CNPJ S/A');
    });
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

  it('filters the grid by search text, status, and document type (Sankhya filter drawer)', async () => {
    const filterableOrgs = [
      { id: 'org-1', name: 'Empresa A', cnpj: '19131243000197', documentType: 'CNPJ', active: true, _count: { users: 2 } },
      { id: 'org-2', name: 'Empresa B', documentType: 'CPF', active: false, _count: { users: 0 } },
    ];
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/organizations') return Promise.resolve({ data: filterableOrgs });
      if (url === '/users') return Promise.resolve({ data: users });
      if (url === '/service-desks') return Promise.resolve({ data: serviceDesks });
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });

    loginAs('ADMIN');
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Empresa A')).toBeInTheDocument();
      expect(screen.getByText('Empresa B')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('ez-toolbar-filter-panel-button'));
    const drawer = screen.getByTestId('ez-filter-drawer');

    // Search text narrows to the matching name only.
    await user.type(within(drawer).getByLabelText(/buscar parceiro/i), 'Empresa A');
    expect(screen.getByText('Empresa A')).toBeInTheDocument();
    expect(screen.queryByText('Empresa B')).not.toBeInTheDocument();
    await user.clear(within(drawer).getByLabelText(/buscar parceiro/i));

    // Status filter narrows to inactive organizations only.
    await user.selectOptions(within(drawer).getByLabelText(/^status$/i), 'INACTIVE');
    expect(screen.queryByText('Empresa A')).not.toBeInTheDocument();
    expect(screen.getByText('Empresa B')).toBeInTheDocument();
    await user.selectOptions(within(drawer).getByLabelText(/^status$/i), 'ALL');

    // Document type filter narrows to CPF-only partners.
    await user.selectOptions(within(drawer).getByLabelText(/tipo de documento/i), 'CPF');
    expect(screen.queryByText('Empresa A')).not.toBeInTheDocument();
    expect(screen.getByText('Empresa B')).toBeInTheDocument();

    // Clearing the drawer resets every filter back to showing both.
    await user.click(screen.getByTestId('ez-filter-drawer-clear'));
    expect(screen.getByText('Empresa A')).toBeInTheDocument();
    expect(screen.getByText('Empresa B')).toBeInTheDocument();
  });

  it('saves, applies, and deletes a saved filter from the drawer (Sankhya saved filters parity)', async () => {
    loginAs('ADMIN');
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Empresa A')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('ez-toolbar-filter-panel-button'));
    const drawer = screen.getByTestId('ez-filter-drawer');

    await user.type(within(drawer).getByLabelText(/buscar parceiro/i), 'Empresa A');
    await user.click(within(drawer).getByTestId('ez-filter-drawer-save-btn'));
    await user.type(within(drawer).getByTestId('ez-filter-drawer-name-input'), 'Só Empresa A');
    await user.click(within(drawer).getByTestId('ez-filter-drawer-confirm-save'));

    const savedList = await within(drawer).findByTestId('ez-filter-drawer-saved-list');
    expect(within(savedList).getByText('Só Empresa A')).toBeInTheDocument();

    // Clear the live filter, then re-apply it from the saved entry.
    await user.clear(within(drawer).getByLabelText(/buscar parceiro/i));
    await user.click(within(savedList).getByText('Só Empresa A'));
    expect(within(drawer).getByLabelText(/buscar parceiro/i)).toHaveValue('Empresa A');

    // Delete the saved filter.
    await user.click(within(savedList).getByLabelText(/excluir filtro só empresa a/i));
    expect(within(drawer).queryByText('Só Empresa A')).not.toBeInTheDocument();
  });

  it('navigates between organizations from the detail view using toolbar Anterior/Próximo', async () => {
    const orgBDetail = {
      ...orgDetail,
      id: 'org-2',
      name: 'Empresa B',
      legalName: 'Empresa B Ltda',
      serviceDesks: [],
      agentGroups: [],
      addresses: [],
      contacts: [],
    };
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/organizations') return Promise.resolve({ data: orgs });
      if (url === '/users') return Promise.resolve({ data: users });
      if (url === '/service-desks') return Promise.resolve({ data: serviceDesks });
      if (url === '/organizations/org-1') return Promise.resolve({ data: orgDetail });
      if (url === '/organizations/org-2') return Promise.resolve({ data: orgBDetail });
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });

    loginAs('ADMIN');
    const user = userEvent.setup();
    renderPage();

    await openDetail(user);

    await user.click(screen.getByTestId('ez-toolbar-next-button'));
    await waitFor(() => {
      expect(screen.getByText('Empresa B Ltda')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('ez-toolbar-previous-button'));
    await waitFor(() => {
      expect(screen.getByText('Empresa A Ltda')).toBeInTheDocument();
    });
  });

  it('duplicates a selected organization into a prefilled Nova Empresa form (Duplicar)', async () => {
    loginAs('ADMIN');
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Empresa A')).toBeInTheDocument();
    });

    const rowCheckboxes = screen.getAllByRole('checkbox');
    await user.click(rowCheckboxes[1]); // select "Empresa A"

    await user.click(screen.getByTestId('ez-toolbar-clone-button'));

    expect(screen.getByText('Nova Empresa')).toBeInTheDocument();
    expect(screen.getByLabelText(/nome fantasia/i)).toHaveValue('Empresa A (Cópia)');
  });

  it('persists column visibility toggles to the per-user screen config (localStorage)', async () => {
    loginAs('ADMIN');
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Empresa A')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('ez-toolbar-screen-config-button'));
    const modal = screen.getByTestId('ez-entity-screen-config-modal');
    await user.click(within(modal).getByTestId('ez-screen-config-toggle-stateRegistration'));

    expect(within(modal).getByTestId('ez-screen-config-toggle-stateRegistration')).toBeChecked();
    const persisted = JSON.parse(localStorage.getItem('aponta_screen_config_u-1_organizations') ?? '{}');
    expect(persisted.grid.columnVisibility.stateRegistration).toBe(true);
  });

  it('edits the optional grid columns (IE, IM, Pasta, Perfil, Saúde) once made visible via screen config', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: {} });
    loginAs('ADMIN');
    const user = userEvent.setup();

    // Simulate a returning user who already revealed these optional
    // columns via the screen configurator in a previous session — the
    // toggle persists to localStorage (useUserScreenConfig) and is read
    // back as EzEntityGrid's *initial* column visibility on mount (see the
    // dedicated persistence test above for the toggle-write side).
    localStorage.setItem(
      'aponta_screen_config_u-1_organizations',
      JSON.stringify({
        grid: {
          columnVisibility: {
            stateRegistration: true,
            municipalRegistration: true,
            workFolder: true,
            serviceType: true,
            healthStatus: true,
          },
          density: 'compact',
        },
        form: { layout: 'CASCADE' },
        viewMode: 'GRID',
        savedFilters: [],
      }),
    );

    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Empresa A')).toBeInTheDocument();
    });

    // EzTextEdit cells render as a plain "click to edit" button showing the
    // placeholder until clicked; clicking swaps it for a real <input> (see
    // EzTextEdit.tsx), which is what we then type into and blur to commit.
    async function editFirstCell(placeholder: string, text: string, expectedPatch: Record<string, string>) {
      await user.click(screen.getAllByRole('button', { name: placeholder })[0]);
      const input = screen.getAllByPlaceholderText(placeholder)[0];
      await user.type(input, text);
      await user.tab();
      await waitFor(() => {
        expect(api.patch).toHaveBeenCalledWith('/organizations/org-1', expectedPatch);
      });
    }

    await editFirstCell('IE', '789', { stateRegistration: '789' });
    await editFirstCell('IM', '321', { municipalRegistration: '321' });
    await editFirstCell('/pasta', '/novo', { workFolder: '/novo' });
    await editFirstCell('Perfil', 'Premium', { serviceType: 'Premium' });
    await editFirstCell('Saúde', 'OK', { healthStatus: 'OK' });
  });

  it('restores default screen configuration from the config modal', async () => {
    loginAs('ADMIN');
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Empresa A')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('ez-toolbar-screen-config-button'));
    const modal = screen.getByTestId('ez-entity-screen-config-modal');
    await user.click(within(modal).getByTestId('ez-config-density-comfortable'));
    await user.click(within(modal).getByText('Restaurar Padrão'));

    expect(within(modal).getByTestId('ez-config-density-compact')).toHaveClass('bg-brand-600');
  });

  it('filters dynamically by any column using the rule builder (Sankhya Filtros parity)', async () => {
    loginAs('ADMIN');
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Empresa A')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('ez-toolbar-filter-panel-button'));
    const drawer = screen.getByTestId('ez-filter-drawer');
    await user.click(within(drawer).getByTestId('ez-dynamic-filter-add'));

    const rule = within(drawer).getByTestId('ez-dynamic-filter-rule');
    const fieldOptions = within(within(rule).getByLabelText('Campo')).getAllByRole('option').map((o) => o.textContent);
    expect(fieldOptions).toEqual(
      expect.arrayContaining(['Nome', 'Razão Social', 'CPF / CNPJ', 'Status', 'Clientes', 'Inscrição Estadual', 'Perfil', 'Saúde']),
    );

    await user.type(within(rule).getByLabelText('Valor'), 'Empresa B');
    expect(screen.queryByText('Empresa A')).not.toBeInTheDocument();
    expect(screen.getByText('Empresa B')).toBeInTheDocument();

    await user.click(screen.getByTestId('ez-filter-drawer-clear'));
    expect(screen.getByText('Empresa A')).toBeInTheDocument();
  });

  it('does not offer grouping and shows the record count in a single place', async () => {
    loginAs('ADMIN');
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Empresa A')).toBeInTheDocument();
    });

    expect(screen.queryByText(/agrupar/i)).not.toBeInTheDocument();
    expect(screen.getAllByText(/1\s?-\s?2 de 2/)).toHaveLength(1);
    expect(screen.queryByText(/^Total:/)).not.toBeInTheDocument();
    void user;
  });
});
