import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Ticket } from '../../hooks/useTickets';
import { api } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import { TicketCsat } from './TicketCsat';

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
  status: 'RESOLVED',
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
      <TicketCsat ticket={ticket} />
    </QueryClientProvider>,
  );
}

function loginAsRequester() {
  useAuthStore.setState({
    token: 'fake-token',
    user: { sub: 'r1', email: 'client@aponta.com', role: 'CLIENT' },
  });
}

function loginAsOther() {
  useAuthStore.setState({
    token: 'fake-token',
    user: { sub: 'agent-1', email: 'agent@aponta.com', role: 'AGENT' },
  });
}

describe('TicketCsat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ token: null, user: null });
  });

  it('renders nothing when the ticket has not been rated and the viewer cannot rate it (not requester)', () => {
    loginAsOther();
    const { container } = renderComponent(baseTicket);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when the requester views an OPEN (not RESOLVED) unrated ticket', () => {
    loginAsRequester();
    const { container } = renderComponent({ ...baseTicket, status: 'OPEN' });
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the rating form for the requester when the ticket is RESOLVED and unrated', () => {
    loginAsRequester();
    renderComponent(baseTicket);

    expect(screen.getByText(/avalie nosso atendimento/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /enviar avaliação/i })).toBeInTheDocument();
  });

  it('submits a star rating and optional comment via PATCH', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: {} });
    loginAsRequester();
    const user = userEvent.setup();
    renderComponent(baseTicket);

    const stars = screen.getAllByRole('button', { name: '★' });
    await user.click(stars[2]); // select 3rd star = score 3

    const commentBox = screen.getByPlaceholderText(/deixe um comentário/i);
    await user.type(commentBox, 'Muito bom atendimento');

    await user.click(screen.getByRole('button', { name: /enviar avaliação/i }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/tickets/t1/csat', {
        score: 3,
        comment: 'Muito bom atendimento',
      });
    });
  });

  it('shows an error message when the CSAT submission fails', async () => {
    vi.mocked(api.patch).mockRejectedValue(new Error('network error'));
    loginAsRequester();
    const user = userEvent.setup();
    renderComponent(baseTicket);

    await user.click(screen.getByRole('button', { name: /enviar avaliação/i }));

    await waitFor(() => {
      expect(screen.getByText(/falha ao salvar avaliação/i)).toBeInTheDocument();
    });
  });

  it('shows the already-rated summary view with the stored score/comment for any viewer', () => {
    loginAsOther();
    renderComponent({ ...baseTicket, csatScore: 4, csatComment: 'Ótimo!' });

    expect(screen.getByText(/avaliação do chamado/i)).toBeInTheDocument();
    expect(screen.getByText('"Ótimo!"')).toBeInTheDocument();
    // not the requester -> no "Alterar Nota" button
    expect(screen.queryByRole('button', { name: /alterar nota/i })).not.toBeInTheDocument();
  });

  it('lets the requester edit an existing rating', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: {} });
    loginAsRequester();
    const user = userEvent.setup();
    renderComponent({ ...baseTicket, csatScore: 4, csatComment: 'Ótimo!' });

    await user.click(screen.getByRole('button', { name: /alterar nota/i }));

    expect(screen.getByText(/avalie nosso atendimento/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /cancelar/i }));

    expect(screen.getByText(/avaliação do chamado/i)).toBeInTheDocument();
  });
});
