import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../lib/api';
import { TicketComments } from './TicketComments';

vi.mock('../../lib/api', () => ({
  api: {
    get: vi.fn(),
  },
}));

function renderComments() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <TicketComments ticketId="t-1" />
    </QueryClientProvider>,
  );
}

describe('TicketComments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders html evidence from a worklog reply without showing raw markup', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: [
        {
          id: 'c-1',
          content: '<p>Atualização do atendimento:</p><img src="/uploads/evidencia.png" alt="Print da correção">',
          isInternal: false,
          ticketId: 't-1',
          authorId: 'agent-1',
          createdAt: '2026-10-14T11:00:00.000Z',
        },
      ],
    });

    renderComments();

    await waitFor(() => {
      expect(screen.getByText('Atualização do atendimento:')).toBeInTheDocument();
    });
    expect(screen.getByAltText('Print da correção')).toBeInTheDocument();
    expect(screen.queryByText(/<img/i)).not.toBeInTheDocument();
  });
});
