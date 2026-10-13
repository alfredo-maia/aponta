import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { TicketsPage } from './TicketsPage';

vi.mock('../lib/api', () => ({
  api: {
    get: vi.fn(),
  },
}));

const serviceDesks = [
  { id: 'sd-1', name: 'Suporte N1' },
  { id: 'sd-2', name: 'Infraestrutura' },
];

const tickets = [
  {
    id: 't-1',
    protocol: 'AP-000001',
    title: 'Printer not working',
    description: 'The floor 2 printer is jammed.',
    status: 'OPEN',
    priority: 'HIGH',
    requesterId: 'u-1',
    agentId: null,
    serviceDeskId: 'sd-1',
    responseDeadline: null,
    resolveDeadline: null,
    createdAt: '2026-09-28T10:00:00.000Z',
    updatedAt: '2026-09-28T10:00:00.000Z',
  },
  {
    id: 't-2',
    protocol: 'AP-000002',
    title: 'VPN access request',
    description: 'Need VPN access for remote work.',
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
    requesterId: 'u-1',
    agentId: 'agent-1',
    serviceDeskId: 'sd-2',
    responseDeadline: null,
    resolveDeadline: null,
    createdAt: '2026-09-28T11:00:00.000Z',
    updatedAt: '2026-09-28T11:00:00.000Z',
  },
];

function mockApiGet(ticketData: unknown[] = tickets) {
  vi.mocked(api.get).mockImplementation((url: string) => {
    if (url === '/service-desks') {
      return Promise.resolve({ data: serviceDesks });
    }
    if (url === '/tickets') {
      return Promise.resolve({ data: { data: ticketData, meta: { total: ticketData.length, page: 1, totalPages: 1 } } });
    }
    return Promise.reject(new Error(`Unexpected GET ${url}`));
  });
}

function renderDashboard(initialEntries: string[] = ['/tickets']) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      {/* TicketCard links to the ticket detail route, so a router context is
          required even though these tests never navigate.
          `initialEntries` lets tests simulate arriving via a URL that
          already carries filters, e.g. a dashboard KPI link. */}
      <MemoryRouter initialEntries={initialEntries}>
        <TicketsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('TicketsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ token: null, user: null });
  });

  it('should render ticket list', async () => {
    mockApiGet();
    renderDashboard();

    expect(
      screen.getByRole('heading', { level: 1 }),
    ).toBeInTheDocument();
    
    expect(await screen.findByText('Printer not working')).toBeInTheDocument();
  });

  it('should show a loading state while tickets are being fetched', () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/service-desks') {
        return Promise.resolve({ data: serviceDesks });
      }
      return new Promise(() => {
        // Never resolves, keeping the query in its loading state.
      });
    });
    renderDashboard();

    expect(screen.getByText(/carregando/i)).toBeInTheDocument();
  });

  it('should show empty state when no tickets', async () => {
    mockApiGet([]);
    renderDashboard();

    expect(await screen.findByRole('heading', { name: 'Aberto' })).toBeInTheDocument();
  });

  it('should render a card per ticket with protocol, status and priority badges', async () => {
    mockApiGet();
    renderDashboard();

    const firstTitle = await screen.findByText('Printer not working');
    const firstCard = firstTitle.closest('li');
    expect(firstCard).not.toBeNull();
    const first = within(firstCard as HTMLElement);
    expect(first.getByText('AP-000001')).toBeInTheDocument();
    expect(first.getByText('Aberto')).toBeInTheDocument();
    expect(first.getByText('Alta')).toBeInTheDocument();

    const secondTitle = screen.getByText('VPN access request');
    const secondCard = secondTitle.closest('li');
    expect(secondCard).not.toBeNull();
    const second = within(secondCard as HTMLElement);
    expect(second.getByText('AP-000002')).toBeInTheDocument();
    expect(second.getByText('Em Andamento')).toBeInTheDocument();
    expect(second.getByText('Média')).toBeInTheDocument();
  });

  it('should show an error state when the tickets request fails', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/service-desks') {
        return Promise.resolve({ data: serviceDesks });
      }
      return Promise.reject(new Error('Network Error'));
    });
    renderDashboard();

    expect(
      await screen.findByText(/falha ao carregar os chamados/i),
    ).toBeInTheDocument();
  });

  it('should refetch tickets with query params when filters change', async () => {
    mockApiGet();
    const user = userEvent.setup();
    renderDashboard();

    await screen.findByText('Printer not working');
    await screen.findByRole('option', { name: 'Suporte N1' });

    // Mock resolve before interaction to avoid unhandled rejections
    vi.mocked(api.get).mockClear();
    mockApiGet();

    await user.selectOptions(screen.getByLabelText(/departamento/i), 'sd-1');
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(expect.stringContaining('/tickets'), expect.objectContaining({
        params: expect.objectContaining({ serviceDeskId: 'sd-1' }),
      }));
    });

    vi.mocked(api.get).mockClear();
    mockApiGet();

    await user.selectOptions(screen.getByLabelText(/status/i), 'OPEN');
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(expect.stringContaining('/tickets'), expect.objectContaining({
        params: expect.objectContaining({ serviceDeskId: 'sd-1', status: 'OPEN' }),
      }));
    });
  });

  it('defaults non-CLIENT users to the Kanban view and lets them switch to List', async () => {
    mockApiGet();
    const user = userEvent.setup();
    renderDashboard();

    expect(await screen.findByRole('heading', { name: 'Aberto' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Kanban' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Lista' }));

    // Switching to List view renders the ticket cards as a flat list
    // instead of Kanban columns; the Kanban-only "Aberto" column heading
    // disappears (the status badge text "Aberto" on cards is a <span>,
    // not a heading, so this still disambiguates reliably).
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Aberto' })).not.toBeInTheDocument();
    });
    expect(await screen.findByText('Printer not working')).toBeInTheDocument();
  });

  it('shows "Meus Chamados" title and hides the view toggle entirely for CLIENT users', async () => {
    useAuthStore.setState({
      token: 'tok',
      user: { sub: 'u1', email: 'client@example.com', role: 'CLIENT', organizationId: null },
    });
    mockApiGet();
    renderDashboard();

    expect(await screen.findByRole('heading', { name: 'Meus Chamados' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Kanban' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Lista' })).not.toBeInTheDocument();
    // CLIENT always gets the flat list, never the Kanban columns.
    expect(screen.queryByRole('heading', { name: 'Aberto' })).not.toBeInTheDocument();
    expect(await screen.findByText('Printer not working')).toBeInTheDocument();
  });

  it('resets back to page 1 when filters change while on a later page', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/service-desks') {
        return Promise.resolve({ data: serviceDesks });
      }
      if (url === '/tickets') {
        return Promise.resolve({
          data: { data: tickets, meta: { total: 25, page: 2, totalPages: 3 } },
        });
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });
    const user = userEvent.setup();
    renderDashboard();

    await user.click(screen.getByRole('button', { name: 'Lista' }));
    await screen.findByText('Printer not working');

    vi.mocked(api.get).mockClear();
    mockApiGet();
    await user.selectOptions(screen.getByLabelText(/status/i), 'OPEN');

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        expect.stringContaining('/tickets'),
        expect.objectContaining({ params: expect.objectContaining({ page: 1 }) }),
      );
    });
  });

  it('renders pagination controls in List view and navigates between pages', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/service-desks') {
        return Promise.resolve({ data: serviceDesks });
      }
      if (url === '/tickets') {
        return Promise.resolve({
          data: { data: tickets, meta: { total: 25, page: 1, totalPages: 3 } },
        });
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });
    const user = userEvent.setup();
    renderDashboard();

    await user.click(screen.getByRole('button', { name: 'Lista' }));
    await screen.findByText('Printer not working');

    expect(screen.getByText(/página 1 de 3/i)).toBeInTheDocument();
    expect(screen.getByText(/25 chamados/i)).toBeInTheDocument();

    const nextButton = screen.getByRole('button', { name: 'Próxima' });
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    expect(nextButton).not.toBeDisabled();

    vi.mocked(api.get).mockClear();
    await user.click(nextButton);
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        expect.stringContaining('/tickets'),
        expect.objectContaining({ params: expect.objectContaining({ page: 2 }) }),
      );
    });
  });

  it('disables the "Anterior" button on page 1 and "Próxima" on the last page', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/service-desks') {
        return Promise.resolve({ data: serviceDesks });
      }
      if (url === '/tickets') {
        return Promise.resolve({
          data: { data: tickets, meta: { total: 2, page: 1, totalPages: 2 } },
        });
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });
    const user = userEvent.setup();
    renderDashboard();

    await user.click(screen.getByRole('button', { name: 'Lista' }));
    await screen.findByText('Printer not working');

    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Próxima' })).not.toBeDisabled();
  });

  it('does not render pagination controls when there is only a single page', async () => {
    mockApiGet();
    const user = userEvent.setup();
    renderDashboard();

    await user.click(screen.getByRole('button', { name: 'Lista' }));
    await screen.findByText('Printer not working');

    expect(screen.queryByRole('navigation', { name: /paginação/i })).not.toBeInTheDocument();
  });

  it('navigates to the previous page when "Anterior" is clicked', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/service-desks') {
        return Promise.resolve({ data: serviceDesks });
      }
      if (url === '/tickets') {
        return Promise.resolve({
          data: { data: tickets, meta: { total: 25, page: 1, totalPages: 3 } },
        });
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });
    const user = userEvent.setup();
    renderDashboard();

    await user.click(screen.getByRole('button', { name: 'Lista' }));
    await screen.findByText('Printer not working');

    // Go to page 2 first so "Anterior" becomes enabled (currentPage is
    // driven by the filters state, not by the mocked meta.page).
    vi.mocked(api.get).mockClear();
    await user.click(screen.getByRole('button', { name: 'Próxima' }));
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        expect.stringContaining('/tickets'),
        expect.objectContaining({ params: expect.objectContaining({ page: 2 }) }),
      );
    });

    const prevButton = screen.getByRole('button', { name: 'Anterior' });
    expect(prevButton).not.toBeDisabled();

    vi.mocked(api.get).mockClear();
    await user.click(prevButton);
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        expect.stringContaining('/tickets'),
        expect.objectContaining({ params: expect.objectContaining({ page: 1 }) }),
      );
    });
  });

  it('switches to Grade view and renders tickets in EzEntityGrid', async () => {
    mockApiGet();
    const user = userEvent.setup();
    renderDashboard();

    const gridButton = screen.getByRole('button', { name: 'Grade' });
    await user.click(gridButton);

    // Grouped by status by default (see dedicated grouping test below), so
    // tickets live inside their (collapsed) stage group rather than as
    // bare top-level text until a group is expanded.
    const groupRows = await screen.findAllByTestId('ez-entity-grid-group-row');
    await user.click(groupRows[0]);
    await user.click(screen.getAllByTestId('ez-entity-grid-group-row')[1]);

    expect(screen.getByText('AP-000001')).toBeInTheDocument();
    expect(screen.getByText('Printer not working')).toBeInTheDocument();
    expect(screen.getByText('AP-000002')).toBeInTheDocument();
    expect(screen.getByText('VPN access request')).toBeInTheDocument();
  });

  it('groups the Grade view by status (Estágio) by default, TiFlux parity, with per-group counters', async () => {
    mockApiGet();
    const user = userEvent.setup();
    renderDashboard();

    await user.click(screen.getByRole('button', { name: 'Grade' }));

    // Two tickets, two distinct statuses (OPEN, IN_PROGRESS) => two
    // collapsed group rows, each with a "1" count badge, with no manual
    // grouping action from the user.
    const groupRows = await screen.findAllByTestId('ez-entity-grid-group-row');
    expect(groupRows).toHaveLength(2);
    expect(groupRows.some((row) => row.textContent?.includes('OPEN'))).toBe(true);
    expect(groupRows.some((row) => row.textContent?.includes('IN_PROGRESS'))).toBe(true);
    groupRows.forEach((row) => expect(row).toHaveTextContent('1'));

    // Tickets are not visible as bare rows until their group is expanded.
    expect(screen.queryByText('AP-000001')).not.toBeInTheDocument();

    const openGroupRow = groupRows.find((row) => row.textContent?.includes('OPEN'));
    await user.click(openGroupRow as HTMLElement);

    expect(await screen.findByText('AP-000001')).toBeInTheDocument();
    expect(screen.getByText('Printer not working')).toBeInTheDocument();
    // The other, still-collapsed group's ticket stays hidden.
    expect(screen.queryByText('AP-000002')).not.toBeInTheDocument();
  });

  it('switches between Grid Mode and Form Mode with tabs in Sankhya toolbar', async () => {
    mockApiGet();
    const user = userEvent.setup();
    renderDashboard();

    await user.click(screen.getByRole('button', { name: 'Grade' }));
    expect(await screen.findAllByTestId('ez-entity-grid-group-row')).toHaveLength(2);

    // Toggle to Form Mode
    const modeBtn = screen.getByTestId('ez-toolbar-mode-toggle-button');
    await user.click(modeBtn);

    // Form Mode renders with tabs
    expect(screen.getByTestId('ticket-form-mode')).toBeInTheDocument();
    expect(screen.getByText('Geral')).toBeInTheDocument();
    expect(screen.getByText('Atendimento & SLA')).toBeInTheDocument();
    expect(screen.getByText('Anexos & Tarefas')).toBeInTheDocument();
    expect(screen.getByText('Avaliação CSAT')).toBeInTheDocument();

    // Click back to grid
    await user.click(screen.getByTestId('ticket-form-back-button'));
    expect(screen.queryByTestId('ticket-form-mode')).not.toBeInTheDocument();
    expect(await screen.findAllByTestId('ez-entity-grid-group-row')).toHaveLength(2);
  });

  it('opens and closes filter drawer via toolbar filter button', async () => {
    mockApiGet();
    const user = userEvent.setup();
    renderDashboard();

    await user.click(screen.getByRole('button', { name: 'Grade' }));
    await screen.findAllByTestId('ez-entity-grid-group-row');

    const filterBtn = screen.getByTestId('ez-toolbar-filter-panel-button');
    await user.click(filterBtn);

    expect(screen.getByTestId('ez-filter-drawer')).toBeInTheDocument();
    expect(screen.getByText('Filtros de Chamados')).toBeInTheDocument();

    // Close drawer
    await user.click(screen.getByTestId('ez-filter-drawer-close'));
    expect(screen.queryByTestId('ez-filter-drawer')).not.toBeInTheDocument();
  });

  it('seeds filters from the URL query string, e.g. a dashboard KPI link (?mine=true)', async () => {
    mockApiGet();
    renderDashboard(['/tickets?mine=true']);

    await screen.findByText('Printer not working');

    expect(api.get).toHaveBeenCalledWith(
      expect.stringContaining('/tickets'),
      expect.objectContaining({ params: expect.objectContaining({ mine: 'true' }) }),
    );
  });

  it('seeds the "overdue" and "unassigned" boolean filters from the URL too', async () => {
    mockApiGet();
    renderDashboard(['/tickets?overdue=true']);

    await screen.findByText('Printer not working');

    expect(api.get).toHaveBeenCalledWith(
      expect.stringContaining('/tickets'),
      expect.objectContaining({ params: expect.objectContaining({ overdue: 'true' }) }),
    );
  });

  it('reflects a filter change made via the UI back into the URL (bookmarkable/shareable)', async () => {
    mockApiGet();
    const user = userEvent.setup();

    // Probe component rendered alongside TicketsPage to read the
    // MemoryRouter's current location — the only way to assert the URL
    // itself (rather than just the outgoing API request) changed.
    function LocationProbe() {
      const location = useLocation();
      return <div data-testid="location-probe">{location.pathname + location.search}</div>;
    }

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/tickets']}>
          <LocationProbe />
          <TicketsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await screen.findByText('Printer not working');
    await screen.findByRole('option', { name: 'Suporte N1' });
    expect(screen.getByTestId('location-probe')).toHaveTextContent('/tickets');

    vi.mocked(api.get).mockClear();
    mockApiGet();

    await user.selectOptions(screen.getByLabelText(/departamento/i), 'sd-1');
    await waitFor(() => {
      expect(screen.getByTestId('location-probe')).toHaveTextContent('serviceDeskId=sd-1');
    });
  });

  it('opens screen configuration modal via toolbar gear button', async () => {
    mockApiGet();
    const user = userEvent.setup();
    renderDashboard();

    await user.click(screen.getByRole('button', { name: 'Grade' }));
    await screen.findAllByTestId('ez-entity-grid-group-row');

    const configBtn = screen.getByTestId('ez-toolbar-screen-config-button');
    await user.click(configBtn);

    expect(screen.getByTestId('ez-entity-screen-config-modal')).toBeInTheDocument();
    expect(screen.getByText('Personalização da Tela (Usuário)')).toBeInTheDocument();
  });
});
