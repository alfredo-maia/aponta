import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Ticket } from '../../hooks/useTickets';
import { api } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import type { Role } from '../../stores/authStore';
import { TicketParentChild } from './TicketParent';

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

function renderComponent(ticket: Ticket) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <TicketParentChild ticket={ticket} />
    </QueryClientProvider>,
  );
}

function loginAs(role: Role) {
  useAuthStore.setState({
    token: 'fake-token',
    user: { sub: 'u-1', email: 'user@aponta.com', role },
  });
}

describe('TicketParentChild', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ token: null, user: null });
  });

  it('renders nothing for a CLIENT (not agent/admin)', () => {
    loginAs('CLIENT');
    const { container } = renderComponent(baseTicket);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the "not linked" prompt for an unlinked, childless ticket (ADMIN)', () => {
    loginAs('ADMIN');
    renderComponent(baseTicket);

    expect(screen.getByText(/este chamado não está vinculado/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /vincular a um chamado pai/i })).toBeInTheDocument();
  });

  it('shows the parent ticket card and allows unlinking when ticket is a child', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: {} });
    loginAs('AGENT');
    const user = userEvent.setup();
    renderComponent({
      ...baseTicket,
      parentTicketId: 'p1',
      parentTicket: { id: 'p1', protocol: 'AP-2026-0000', title: 'Parent issue', status: 'OPEN' },
    } as Ticket);

    expect(screen.getByText('AP-2026-0000')).toBeInTheDocument();
    expect(screen.getByText('Parent issue')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /desvincular/i }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/tickets/t1/parent', { parentProtocol: null });
    });
  });

  it('switches to edit mode and submits a parent protocol to link', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: {} });
    loginAs('ADMIN');
    const user = userEvent.setup();
    renderComponent(baseTicket);

    await user.click(screen.getByRole('button', { name: /vincular a um chamado pai/i }));

    const input = screen.getByPlaceholderText(/digite o protocolo/i);
    await user.type(input, 'AP-2026-9999');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/tickets/t1/parent', {
        parentProtocol: 'AP-2026-9999',
      });
    });
  });

  it('lists sub-tickets when the ticket is a parent (hasChildren)', () => {
    loginAs('AGENT_MASTER');
    renderComponent({
      ...baseTicket,
      subTickets: [
        { id: 's1', protocol: 'AP-2026-0010', title: 'Sub one', status: 'OPEN' },
        { id: 's2', protocol: 'AP-2026-0011', title: 'Sub two', status: 'RESOLVED' },
      ],
    } as Ticket);

    expect(screen.getByText(/este é o chamado pai de 2 solicitações/i)).toBeInTheDocument();
    expect(screen.getByText('Sub one')).toBeInTheDocument();
    expect(screen.getByText('Sub two')).toBeInTheDocument();
  });
});
