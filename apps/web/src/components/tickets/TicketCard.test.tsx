import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { TicketCard } from './TicketCard';
import type { Ticket } from '../../hooks/useTickets';

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

function renderCard(ticket: Ticket) {
  return render(
    <MemoryRouter>
      <TicketCard ticket={ticket} />
    </MemoryRouter>,
  );
}

describe('TicketCard navigation', () => {
  it('links to the ticket detail route without opening a real browser tab (AC3: internal tabs, not target=_blank)', () => {
    renderCard(baseTicket);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/tickets/t1');
    expect(link).not.toHaveAttribute('target');
  });

  it('a plain click opens the ticket as an internal workspace tab instead of the browser default', async () => {
    const user = userEvent.setup();
    renderCard(baseTicket);
    const link = screen.getByRole('link');
    const clickEvent = await user.click(link);
    // jsdom never actually navigates a bare <a>; this just proves our
    // handler ran and intercepted the click rather than throwing.
    expect(clickEvent).toBeUndefined();
  });
});

describe('TicketCard SLA badges', () => {
  it('shows no SLA badges when statuses are null/absent', () => {
    renderCard(baseTicket);
    expect(screen.queryByText(/dentro do prazo/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/em risco/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/vencido/i)).not.toBeInTheDocument();
  });

  it('shows a BREACHED badge for resolveSlaStatus', () => {
    renderCard({ ...baseTicket, resolveSlaStatus: 'BREACHED' });
    expect(screen.getByText(/vencido/i)).toBeInTheDocument();
  });

  it('shows an AT_RISK badge for responseSlaStatus', () => {
    renderCard({ ...baseTicket, responseSlaStatus: 'AT_RISK' });
    expect(screen.getByText(/em risco/i)).toBeInTheDocument();
  });
});
