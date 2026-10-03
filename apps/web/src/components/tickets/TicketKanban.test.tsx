import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Ticket } from '../../hooks/useTickets';
import { useAuthStore } from '../../stores/authStore';
import { TicketKanban } from './TicketKanban';

vi.mock('../../lib/api', () => ({
  api: {
    patch: vi.fn(),
  },
}));

const baseTicket: Ticket = {
  id: 't1',
  protocol: 'AP-2026-0001',
  title: 'Printer broken',
  description: 'desc',
  status: 'OPEN',
  priority: 'HIGH',
  requesterId: 'r1',
  agentId: null,
  serviceDeskId: 'desk-1',
  responseDeadline: '2026-01-01T10:00:00.000Z',
  resolveDeadline: '2026-01-02T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function renderKanban(props: { tickets: Ticket[]; isLoading: boolean; isError: boolean }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <TicketKanban {...props} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('TicketKanban', () => {
  beforeEach(() => {
    useAuthStore.setState({ token: null, user: null });
  });

  it('shows a skeleton loading state with every column label while isLoading', () => {
    renderKanban({ tickets: [], isLoading: true, isError: false });

    expect(screen.getByText('Carregando...')).toBeInTheDocument();
    expect(screen.getByText('Aberto')).toBeInTheDocument();
    expect(screen.getByText('Fechado')).toBeInTheDocument();
  });

  it('shows an error message when isError is true', () => {
    renderKanban({ tickets: [], isLoading: false, isError: true });
    expect(screen.getByRole('alert')).toHaveTextContent(/falha ao carregar os chamados/i);
  });

  it('groups tickets into their matching status column with correct counts', () => {
    const tickets = [
      baseTicket,
      { ...baseTicket, id: 't2', protocol: 'AP-2026-0002', status: 'IN_PROGRESS' as const },
      { ...baseTicket, id: 't3', protocol: 'AP-2026-0003', status: 'OPEN' as const },
    ];
    renderKanban({ tickets, isLoading: false, isError: false });

    expect(screen.getByText('AP-2026-0001')).toBeInTheDocument();
    expect(screen.getByText('AP-2026-0002')).toBeInTheDocument();
    expect(screen.getByText('AP-2026-0003')).toBeInTheDocument();

    // "Aberto" column (OPEN) should show count 2, "Em Andamento" should show 1
    const abertoHeading = screen.getAllByText('Aberto').find((el) => el.tagName === 'H3')!;
    const abertoColumn = abertoHeading.closest('div')?.parentElement as HTMLElement;
    expect(abertoColumn).toHaveTextContent('2');
  });

  it('renders an empty column (count 0) when there are no tickets for that status', () => {
    renderKanban({ tickets: [], isLoading: false, isError: false });

    const abertoHeading = screen.getAllByText('Aberto').find((el) => el.tagName === 'H3')!;
    const abertoColumn = abertoHeading.closest('div')?.parentElement as HTMLElement;
    expect(abertoColumn).toHaveTextContent('0');
  });
});
