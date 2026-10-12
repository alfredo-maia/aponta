import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
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

  it('renders the summary metric tiles once loaded', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        openCount: 5,
        closedCount: 12,
        slaBreachedCount: 2,
        avgResolutionMinutes: 125,
        byStatus: { OPEN: 3, IN_PROGRESS: 2 },
      },
    });
    renderDashboard();

    expect(await screen.findByText('5')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('Chamados Abertos')).toBeInTheDocument();
    expect(screen.getByText('SLA Estourado')).toBeInTheDocument();
    expect(screen.getByText('2h 5m')).toBeInTheDocument();
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
    expect(screen.getByText('—')).toBeInTheDocument();
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

  it('renders greeting with emoji and TiFlux tabs', async () => {
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

    // Check greeting with emoji 👋
    expect(await screen.findByText(/👋.*!/i)).toBeInTheDocument();

    // Check TiFlux tabs
    expect(screen.getByRole('tab', { name: 'Tickets' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Chats' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Recurso' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Horas' })).toBeInTheDocument();
  });

  it('switches to Chats tab and renders chat quadrants and departments', async () => {
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

  it('switches to Recurso tab and renders appointments', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        openCount: 2,
        closedCount: 5,
        slaBreachedCount: 0,
        avgResolutionMinutes: 45,
        byStatus: { OPEN: 2 },
        myAppointments: {
          total: 1,
          today: 1,
          week: 1,
          month: 1,
          items: [{ id: '1', title: 'Reunião de Alinhamento', client: 'Empresa Alpha', time: '14:00', status: 'Confirmado' }],
        },
        allAppointments: {
          total: 2,
          today: 1,
          week: 2,
          month: 2,
          items: [{ id: '2', title: 'Treinamento de Equipe', client: 'Empresa Beta', time: '16:00', status: 'Agendado', agent: 'Ana' }],
        },
      },
    });
    const { userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();

    renderDashboard();

    const recursoTab = await screen.findByRole('tab', { name: 'Recurso' });
    await user.click(recursoTab);

    expect(screen.getByText('Meus compromissos')).toBeInTheDocument();
    expect(screen.getByText('Todos os compromissos')).toBeInTheDocument();
    expect(screen.getByText('Reunião de Alinhamento')).toBeInTheDocument();
    expect(screen.getByText('Treinamento de Equipe')).toBeInTheDocument();
  });

  it('switches to Horas tab and renders monthly logged hours', async () => {
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

    expect(screen.getByText('Minhas horas apontadas')).toBeInTheDocument();
    expect(screen.getByText('40H')).toBeInTheDocument();
    expect(screen.getByText('120H')).toBeInTheDocument();
    expect(screen.getByText('160H')).toBeInTheDocument();
    expect(screen.getByText('Meta Diária (8H)')).toBeInTheDocument();
  });
});
