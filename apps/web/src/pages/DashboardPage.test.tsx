import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../lib/api';
import { DashboardPage } from './DashboardPage';

vi.mock('../lib/api', () => ({
  api: {
    get: vi.fn(),
  },
}));

function renderDashboard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <DashboardPage />
    </QueryClientProvider>,
  );
}

function card(testId: string) {
  return within(screen.getByTestId(testId));
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a loading spinner while the summary is being fetched', () => {
    vi.mocked(api.get).mockImplementation(
      () =>
        new Promise(() => {
          // never resolves
        }),
    );
    renderDashboard();

    expect(screen.getByText(/carregando métricas/i)).toBeInTheDocument();
  });

  it('renders the greeting (TiFlux "Bom te ver de volta" copy) and the four plain-text tabs', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        openCount: 2,
        closedCount: 5,
        slaBreachedCount: 0,
        avgResolutionMinutes: 45,
        byStatus: { OPEN: 2 },
      },
    });
    renderDashboard();

    expect(await screen.findByText(/bom te ver de volta/i)).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Tickets' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Chats' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Recurso' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Horas' })).toBeInTheDocument();
  });

  it('shows the "Modo TV" control and a working "Ações" menu with Novo Ticket', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { openCount: 0, closedCount: 0, slaBreachedCount: 0, avgResolutionMinutes: null, byStatus: {} },
    });
    const { userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    renderDashboard();

    await screen.findByText(/bom te ver de volta/i);
    expect(screen.getByTitle('Em breve')).toHaveTextContent('Modo TV');

    const acoesButton = screen.getByRole('button', { name: /ações/i });
    await user.click(acoesButton);
    expect(screen.getByRole('menuitem', { name: /novo ticket/i })).toBeInTheDocument();
  });

  it('renders the Resumo de tickets KPI row from ticketSummary', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        openCount: 5,
        closedCount: 12,
        slaBreachedCount: 2,
        avgResolutionMinutes: 125,
        byStatus: { OPEN: 3, IN_PROGRESS: 2 },
        ticketSummary: { total: 74, mine: 4, unattended: 11, inProgress: 73, paused: 9, overdue: 72 },
      },
    });
    renderDashboard();

    await screen.findByTestId('card-resumo-de-tickets');
    const resumoCard = card('card-resumo-de-tickets');
    expect(resumoCard.getByText('74')).toBeInTheDocument();
    expect(resumoCard.getByText('4')).toBeInTheDocument();
    expect(resumoCard.getByText('11')).toBeInTheDocument();
    expect(resumoCard.getByText('73')).toBeInTheDocument();
    expect(resumoCard.getByText('9')).toBeInTheDocument();
    expect(resumoCard.getByText('72')).toBeInTheDocument();
  });

  it('renders the open-tickets-by-status breakdown', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        openCount: 3,
        closedCount: 0,
        slaBreachedCount: 0,
        avgResolutionMinutes: null,
        byStatus: { OPEN: 2, ESCALATED: 1 },
      },
    });
    renderDashboard();

    expect(await screen.findByText('Aberto')).toBeInTheDocument();
    expect(screen.getByText('Escalonado')).toBeInTheDocument();
  });

  it('shows an empty message when there are no open tickets', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        openCount: 0,
        closedCount: 4,
        slaBreachedCount: 0,
        avgResolutionMinutes: 30,
        byStatus: {},
      },
    });
    renderDashboard();

    expect(
      await screen.findByText(/nenhum chamado aberto/i),
    ).toBeInTheDocument();
  });

  it('shows an error message when the summary request fails', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('Network Error'));
    renderDashboard();

    expect(
      await screen.findByText(/falha ao carregar as métricas/i),
    ).toBeInTheDocument();
  });

  it('renders a real pie chart (not a donut) for Tickets em andamento and switches grouping via plain tabs', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        openCount: 2,
        closedCount: 5,
        slaBreachedCount: 0,
        avgResolutionMinutes: 45,
        byStatus: { OPEN: 2 },
        inProgressBreakdown: {
          byAssignee: [{ name: 'Joana', count: 5 }, { name: 'Pedro', count: 3 }],
          byServiceDesk: [{ name: 'Mesa Central', count: 8 }],
          byOrganization: [],
          byResource: [],
        },
      },
    });
    const { userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    renderDashboard();

    const pieCard = within(await screen.findByTestId('card-tickets-em-andamento'));
    expect(pieCard.getByText('Joana')).toBeInTheDocument();
    expect(pieCard.getByText('Tickets 5')).toBeInTheDocument();
    // No donut hole: the chart is built from <path> wedges (or a single <circle> for one slice), never a ring.
    expect(pieCard.getByRole('img', { name: /tickets em andamento/i })).toBeInTheDocument();

    await user.click(pieCard.getByRole('tab', { name: 'Por mesa' }));
    expect(pieCard.getByText('Mesa Central')).toBeInTheDocument();
  });

  it('switches to Chats tab and renders chat KPI rows, departments and agents tables', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        openCount: 2,
        closedCount: 5,
        slaBreachedCount: 0,
        avgResolutionMinutes: 45,
        byStatus: { OPEN: 2 },
        myChats: { inProgress: 1, waitingResponse: 0, avgWaitMinutes: 3, avgServiceMinutes: 18 },
        allChats: { inProgress: 2, waitingResponse: 1, avgWaitMinutes: 5, avgServiceMinutes: 20 },
        chatsByDepartment: [
          {
            department: 'Suporte Técnico',
            total: 5,
            inProgress: 3,
            waitingQueue: 1,
            waitingResponse: 1,
            avgWait: '4m',
            avgService: '18m',
          },
        ],
        chatsByAgent: [
          { name: 'Carlos Atendente', status: 'online', inProgress: 2, group: 'N1' },
        ],
      },
    });
    const { userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();

    renderDashboard();

    const chatsTab = await screen.findByRole('tab', { name: 'Chats' });
    await user.click(chatsTab);

    expect(screen.getByText('Meus chats')).toBeInTheDocument();
    expect(screen.getByText('Todos os chats')).toBeInTheDocument();
    expect(screen.getByText('Chats por departamentos')).toBeInTheDocument();
    expect(screen.getByText('Suporte Técnico')).toBeInTheDocument();
    expect(screen.getByText('Chats por atendentes')).toBeInTheDocument();
    expect(screen.getByText('Carlos Atendente')).toBeInTheDocument();
  });

  it('shows a "Não há dados" empty state for chat tables when there is no data, instead of fabricated rows', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        openCount: 0,
        closedCount: 0,
        slaBreachedCount: 0,
        avgResolutionMinutes: null,
        byStatus: {},
        chatsByDepartment: [],
        chatsByAgent: [],
      },
    });
    const { userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    renderDashboard();

    await user.click(await screen.findByRole('tab', { name: 'Chats' }));

    const deptCard = within(screen.getByTestId('card-chats-por-departamentos'));
    expect(deptCard.getByText('Não há dados')).toBeInTheDocument();
    const agentCard = within(screen.getByTestId('card-chats-por-atendentes'));
    expect(agentCard.getByText('Não há dados')).toBeInTheDocument();
    // None of the previously-hardcoded placeholder people should ever appear.
    expect(screen.queryByText('Alfredo Maia')).not.toBeInTheDocument();
    expect(screen.queryByText('Hermes Agent')).not.toBeInTheDocument();
    expect(screen.queryByText('Consultor DM')).not.toBeInTheDocument();
  });

  it('switches to Recurso tab and renders compromisso KPI rows (TiFlux shows counts, not an item list)', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        openCount: 2,
        closedCount: 5,
        slaBreachedCount: 0,
        avgResolutionMinutes: 45,
        byStatus: { OPEN: 2 },
        myAppointments: { total: 3, today: 1, week: 2, month: 5, items: [] },
        allAppointments: { total: 320, today: 4, week: 24, month: 147, items: [] },
      },
    });
    const { userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();

    renderDashboard();

    const recursoTab = await screen.findByRole('tab', { name: 'Recurso' });
    await user.click(recursoTab);

    const meus = within(screen.getByTestId('card-meus-compromissos'));
    expect(meus.getByText('3')).toBeInTheDocument();
    expect(meus.getByText('1')).toBeInTheDocument();
    expect(meus.getByText('2')).toBeInTheDocument();
    expect(meus.getByText('5')).toBeInTheDocument();

    const todos = within(screen.getByTestId('card-todos-os-compromissos'));
    expect(todos.getByText('320')).toBeInTheDocument();
    expect(todos.getByText('4')).toBeInTheDocument();
    expect(todos.getByText('24')).toBeInTheDocument();
    expect(todos.getByText('147')).toBeInTheDocument();
  });

  it('switches to Horas tab and renders Ontem/Hoje plus the weekly line chart and monthly totals', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        openCount: 2,
        closedCount: 5,
        slaBreachedCount: 0,
        avgResolutionMinutes: 45,
        byStatus: { OPEN: 2 },
        monthlyHours: {
          targetHoursTotal: 160,
          loggedHoursTotal: 40,
          remainingHoursTotal: 120,
          days: [
            { day: 1, date: '2026-10-01', targetHours: 8, loggedHours: 6, remainingHours: 2 },
            { day: 2, date: '2026-10-02', targetHours: 8, loggedHours: 8, remainingHours: 0 },
          ],
        },
      },
    });
    const { userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();

    renderDashboard();

    const horasTab = await screen.findByRole('tab', { name: 'Horas' });
    await user.click(horasTab);

    const horasCard = within(screen.getByTestId('card-minhas-horas-apontadas'));
    expect(horasCard.getByText('Ontem')).toBeInTheDocument();
    expect(horasCard.getByText('Hoje')).toBeInTheDocument();
    expect(horasCard.getByText('40H')).toBeInTheDocument();
    expect(horasCard.getByText('120H')).toBeInTheDocument();
    expect(horasCard.getByText('160H')).toBeInTheDocument();
    expect(horasCard.getByRole('img', { name: /gráfico de linha/i })).toBeInTheDocument();
  });

  it('renders the 3-series Tickets nos últimos 30 dias line chart from real backend trend data', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        openCount: 2,
        closedCount: 5,
        slaBreachedCount: 0,
        avgResolutionMinutes: 45,
        byStatus: { OPEN: 2 },
        ticketsTrend30d: [
          { date: '2026-10-10', created: 3, closed: 1, cancelled: 0 },
          { date: '2026-10-11', created: 2, closed: 2, cancelled: 0 },
        ],
      },
    });
    const { userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    renderDashboard();

    await user.click(await screen.findByRole('tab', { name: 'Horas' }));

    const trendCard = within(screen.getByTestId('card-tickets-nos-ultimos-30-dias'));
    expect(trendCard.getByText('Tickets criados')).toBeInTheDocument();
    expect(trendCard.getByText('Tickets fechados')).toBeInTheDocument();
    expect(trendCard.getByText('Tickets cancelados')).toBeInTheDocument();
  });
});
