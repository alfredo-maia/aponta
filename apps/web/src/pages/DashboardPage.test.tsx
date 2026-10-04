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
});
