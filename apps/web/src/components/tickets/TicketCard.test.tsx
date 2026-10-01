import { render, screen } from '@testing-library/react';
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
