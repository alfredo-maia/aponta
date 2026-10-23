import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import type { Ticket } from '../../hooks/useTickets';
import { TicketKanbanCard } from './TicketKanbanCard';

const baseTicket: Ticket = {
  id: 't1',
  protocol: 'AP-2026-0001',
  title:
    'Impressora do segundo andar não liga e o processo de devolução está travado desde ontem',
  description: 'desc',
  status: 'OPEN',
  priority: 'HIGH',
  requesterId: 'r1',
  requester: {
    id: 'r1',
    name: 'Maria Souza',
    email: 'maria@acme.com',
    organizationId: 'org-1',
    organization: { id: 'org-1', name: 'Acme Corporation' },
  },
  agentId: 'agent-1',
  agent: { id: 'agent-1', name: 'João Pereira' },
  serviceDeskId: 'desk-1',
  responseDeadline: '2026-01-01T10:00:00.000Z',
  resolveDeadline: '2026-01-02T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function renderCard(ticket: Ticket = baseTicket) {
  return render(
    <MemoryRouter>
      <TicketKanbanCard ticket={ticket} />
    </MemoryRouter>,
  );
}

describe('TicketKanbanCard (D7)', () => {
  it('is a single link for the whole card, with the protocol highlighted and an accessible label', () => {
    renderCard();
    const link = screen.getByRole('link', { name: /AP-2026-0001/ });
    expect(link).toHaveAttribute('href', '/tickets/t1');
    expect(link).not.toHaveAttribute('target');
    expect(screen.getByText('#AP-2026-0001')).toBeInTheDocument();
  });

  it('truncates a long title with line-clamp-2 and keeps the full text in the title attribute', () => {
    renderCard();
    const title = screen.getByText(baseTicket.title);
    expect(title).toHaveClass('line-clamp-2');
    expect(title).toHaveAttribute('title', baseTicket.title);
  });

  it('shows the requester\'s organization (truncated) and the Status tag', () => {
    renderCard();
    expect(screen.getByText('Acme Corporation')).toBeInTheDocument();
    expect(screen.getByText('Aberto')).toBeInTheDocument();
  });

  it('shows Prioridade as the tag instead of Status when tagField="priority"', () => {
    render(
      <MemoryRouter>
        <TicketKanbanCard ticket={baseTicket} tagField="priority" />
      </MemoryRouter>,
    );
    expect(screen.queryByText('Aberto')).not.toBeInTheDocument();
    expect(screen.getByText('Alta')).toBeInTheDocument();
  });

  it("shows a small avatar for the assigned agent, initials-based (no photo in the schema)", () => {
    renderCard();
    expect(screen.getByText('JP')).toBeInTheDocument();
  });

  it('shows SLA badges when a status is present', () => {
    renderCard({ ...baseTicket, responseSlaStatus: 'AT_RISK', resolveSlaStatus: 'BREACHED' });
    expect(screen.getByText(/em risco/i)).toBeInTheDocument();
    expect(screen.getByText(/vencido/i)).toBeInTheDocument();
  });

  it('has a menu with only "Abrir ticket" and "Abrir em nova aba interna" (no apontamento/play)', async () => {
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByRole('button', { name: /mais ações/i }));

    expect(screen.getByRole('menuitem', { name: 'Abrir ticket' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Abrir em nova aba interna' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /apontamento/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId('play-apontamento')).not.toBeInTheDocument();
  });

  it('clicking the menu trigger does not also trigger the card link navigation', async () => {
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByRole('button', { name: /mais ações/i }));
    // If propagation leaked to the Link, this would throw jsdom's
    // "not implemented: navigation" error; reaching this line proves it didn't.
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });
});
