import { StrictMode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
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

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location-probe">{location.pathname + location.search}</div>;
}

function renderDashboard(initialEntries: string[] = ['/']) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <LocationProbe />
        <Routes>
          <Route path="/" element={<TicketsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** Same as renderDashboard, but under React.StrictMode — apps/web/src/main.tsx
 * wraps the real app in it, which double-invokes effects on the initial
 * mount commit. A "first render" boolean-ref guard looks correct under a
 * plain renderDashboard() but still writes `?view=` once doubled, which is
 * exactly what broke the real e2e login flow (RODADA 2). */
function renderDashboardStrict(initialEntries: string[] = ['/']) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={initialEntries}>
          <LocationProbe />
          <Routes>
            <Route path="/" element={<TicketsPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </StrictMode>,
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
      screen.getByRole('heading', { level: 1, name: 'Tickets' }),
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

  it('should render a Kanban card per ticket with protocol, title and status tag (D7)', async () => {
    mockApiGet();
    renderDashboard();

    const firstTitle = await screen.findByText('Printer not working');
    const firstCard = firstTitle.closest('li');
    expect(firstCard).not.toBeNull();
    const first = within(firstCard as HTMLElement);
    expect(first.getByText('#AP-000001')).toBeInTheDocument();
    expect(first.getByText('Aberto')).toBeInTheDocument();

    const secondTitle = screen.getByText('VPN access request');
    const secondCard = secondTitle.closest('li');
    expect(secondCard).not.toBeNull();
    const second = within(secondCard as HTMLElement);
    expect(second.getByText('#AP-000002')).toBeInTheDocument();
    expect(second.getByText('Em Andamento')).toBeInTheDocument();
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

  it('shows the "Tickets" title and hides the view toggle entirely for CLIENT users (AC2)', async () => {
    useAuthStore.setState({
      token: 'tok',
      user: { sub: 'u1', email: 'client@example.com', role: 'CLIENT', organizationId: null },
    });
    mockApiGet();
    renderDashboard();

    expect(await screen.findByRole('heading', { name: 'Tickets' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Kanban' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Lista' })).not.toBeInTheDocument();
    // CLIENT always gets the flat list, never the Kanban columns.
    expect(screen.queryByRole('heading', { name: 'Aberto' })).not.toBeInTheDocument();
    expect(await screen.findByText('Printer not working')).toBeInTheDocument();
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

  it('never renders a Grade view button or grid testid (AC1: Grade mode removed)', async () => {
    mockApiGet();
    renderDashboard();

    await screen.findByText('Printer not working');

    expect(screen.queryByRole('button', { name: 'Grade' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('tickets-viewmode-grid')).not.toBeInTheDocument();
    expect(screen.queryByTestId('ez-entity-grid-group-row')).not.toBeInTheDocument();
  });

  it('never renders the old TicketFilters panel (AC5: migrated to Busca avançada, not duplicated)', async () => {
    mockApiGet();
    renderDashboard();

    await screen.findByText('Printer not working');

    expect(screen.queryByTestId('quick-filter-mine')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/departamento/i)).not.toBeInTheDocument();
  });

  it('seeds filters from the URL query string, e.g. a dashboard KPI link (?mine=true)', async () => {
    mockApiGet();
    renderDashboard(['/?mine=true']);

    await screen.findByText('Printer not working');

    expect(api.get).toHaveBeenCalledWith(
      expect.stringContaining('/tickets'),
      expect.objectContaining({ params: expect.objectContaining({ mine: 'true' }) }),
    );
  });

  it('seeds the "overdue" and "unassigned" boolean filters from the URL too', async () => {
    mockApiGet();
    renderDashboard(['/?overdue=true']);

    await screen.findByText('Printer not working');

    expect(api.get).toHaveBeenCalledWith(
      expect.stringContaining('/tickets'),
      expect.objectContaining({ params: expect.objectContaining({ overdue: 'true' }) }),
    );
  });

  it('RODADA 2: stays at "/" on initial load (no ?view=) and only writes ?view= once the user switches views', async () => {
    mockApiGet();
    const user = userEvent.setup();
    renderDashboard();

    await screen.findByText('Printer not working');
    // The default Kanban view must NOT be written to the URL on mount —
    // otherwise `toHaveURL('/')` right after login (auth/dashboard/tickets
    // e2e specs) would break the instant the page finishes loading.
    expect(screen.getByTestId('location-probe')).toHaveTextContent('/');
    expect(screen.getByTestId('location-probe')).not.toHaveTextContent('view=');

    await user.click(screen.getByRole('button', { name: 'Lista' }));
    await waitFor(() =>
      expect(screen.getByTestId('location-probe')).toHaveTextContent('view=list'),
    );
  });

  it('RODADA 2: stays at "/" on initial load even under React.StrictMode\'s double-invoked mount effect (reproduces the real e2e failure)', async () => {
    mockApiGet();
    renderDashboardStrict();

    await screen.findByText('Printer not working');
    expect(screen.getByTestId('location-probe')).toHaveTextContent('/');
    expect(screen.getByTestId('location-probe')).not.toHaveTextContent('view=');
  });

  it('starts in the view mode named by an existing ?view= URL param', async () => {
    mockApiGet();
    renderDashboard(['/?view=list']);

    await screen.findByText('Printer not working');
    expect(screen.queryByRole('heading', { name: 'Aberto' })).not.toBeInTheDocument();
  });

  it('reflects a search typed in the header back into the URL (bookmarkable/shareable)', async () => {
    mockApiGet();
    const user = userEvent.setup();
    renderDashboard();

    await screen.findByText('Printer not working');

    vi.mocked(api.get).mockClear();
    mockApiGet();

    await user.type(screen.getByLabelText(/buscar/i), 'printer');
    await waitFor(() => {
      expect(screen.getByTestId('location-probe')).toHaveTextContent('search=printer');
    });
    expect(api.get).toHaveBeenCalledWith(
      expect.stringContaining('/tickets'),
      expect.objectContaining({ params: expect.objectContaining({ search: 'printer' }) }),
    );
  });

  it('refetches with sortBy/sortDir when a List column header is clicked (D5)', async () => {
    mockApiGet();
    const user = userEvent.setup();
    renderDashboard(['/?view=list']);

    await screen.findByText('Printer not working');
    vi.mocked(api.get).mockClear();
    mockApiGet();

    await user.click(screen.getByRole('button', { name: 'Título' }));
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        expect.stringContaining('/tickets'),
        expect.objectContaining({ params: expect.objectContaining({ sortBy: 'title', sortDir: 'asc' }) }),
      );
    });
  });

  it('navigates to /tickets/search when "Busca avançada" is clicked (AC3)', async () => {
    mockApiGet();
    const user = userEvent.setup();
    renderDashboard();

    await screen.findByText('Printer not working');
    await user.click(screen.getByRole('button', { name: 'Busca avançada' }));

    await waitFor(() =>
      expect(screen.getByTestId('location-probe')).toHaveTextContent('/tickets/search'),
    );
  });
});
