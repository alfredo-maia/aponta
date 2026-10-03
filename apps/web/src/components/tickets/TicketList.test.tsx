import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import type { Ticket } from '../../hooks/useTickets';
import { TicketList } from './TicketList';

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

function renderList(props: { tickets: Ticket[]; isLoading: boolean; isError: boolean }) {
  return render(
    <MemoryRouter>
      <TicketList {...props} />
    </MemoryRouter>,
  );
}

describe('TicketList', () => {
  it('shows a loading indicator when isLoading is true', () => {
    renderList({ tickets: [], isLoading: true, isError: false });
    expect(screen.getByRole('status')).toHaveTextContent(/carregando chamados/i);
  });

  it('shows an error message when isError is true', () => {
    renderList({ tickets: [], isLoading: false, isError: true });
    expect(screen.getByRole('alert')).toHaveTextContent(/falha ao carregar os chamados/i);
  });

  it('shows an empty-state message when there are no tickets', () => {
    renderList({ tickets: [], isLoading: false, isError: false });
    expect(screen.getByText(/nenhum chamado encontrado/i)).toBeInTheDocument();
  });

  it('renders a TicketCard for each ticket', () => {
    const tickets = [
      baseTicket,
      { ...baseTicket, id: 't2', protocol: 'AP-2026-0002', title: 'Email down' },
    ];
    renderList({ tickets, isLoading: false, isError: false });

    expect(screen.getByText('Printer broken')).toBeInTheDocument();
    expect(screen.getByText('Email down')).toBeInTheDocument();
  });
});
