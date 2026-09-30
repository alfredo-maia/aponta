import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../lib/api';
import { DashboardPage } from './DashboardPage';

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
      return Promise.resolve({ data: ticketData });
    }
    return Promise.reject(new Error(`Unexpected GET ${url}`));
  });
}

function renderDashboard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      {/* TicketCard links to the ticket detail route, so a router context is
          required even though these tests never navigate. */}
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render ticket list', async () => {
    mockApiGet();
    renderDashboard();

    expect(
      screen.getByRole('heading', { name: /tickets/i }),
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

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should show empty state when no tickets', async () => {
    mockApiGet([]);
    renderDashboard();

    expect(await screen.findByText(/no tickets found/i)).toBeInTheDocument();
  });

  it('should render a card per ticket with protocol, status and priority badges', async () => {
    mockApiGet();
    renderDashboard();

    const firstTitle = await screen.findByText('Printer not working');
    const firstCard = firstTitle.closest('li');
    expect(firstCard).not.toBeNull();
    const first = within(firstCard as HTMLElement);
    expect(first.getByText('AP-000001')).toBeInTheDocument();
    expect(first.getByText('Open')).toBeInTheDocument();
    expect(first.getByText('High')).toBeInTheDocument();

    const secondTitle = screen.getByText('VPN access request');
    const secondCard = secondTitle.closest('li');
    expect(secondCard).not.toBeNull();
    const second = within(secondCard as HTMLElement);
    expect(second.getByText('AP-000002')).toBeInTheDocument();
    expect(second.getByText('In Progress')).toBeInTheDocument();
    expect(second.getByText('Medium')).toBeInTheDocument();
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
      await screen.findByText(/failed to load tickets/i),
    ).toBeInTheDocument();
  });

  it('should refetch tickets with query params when filters change', async () => {
    mockApiGet();
    const user = userEvent.setup();
    renderDashboard();

    await screen.findByText('Printer not working');
    await screen.findByRole('option', { name: 'Suporte N1' });

    await user.selectOptions(screen.getByLabelText(/service desk/i), 'sd-1');
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/tickets', {
        params: { serviceDeskId: 'sd-1' },
      });
    });

    await user.selectOptions(screen.getByLabelText(/status/i), 'OPEN');
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/tickets', {
        params: { serviceDeskId: 'sd-1', status: 'OPEN' },
      });
    });
  });
});
