import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TicketFormMode } from './TicketFormMode';
import type { Ticket } from '../../hooks/useTickets';

const mockTicket: Ticket = {
  id: 'ticket-1',
  protocol: 'AP-100001',
  title: 'Problema na impressora fiscal',
  description: 'A impressora não está respondendo aos comandos de impressão.',
  status: 'OPEN',
  priority: 'HIGH',
  requesterId: 'req-1',
  agentId: 'agent-1',
  serviceDeskId: 'sd-suporte',
  responseDeadline: '2026-10-15T14:00:00Z',
  resolveDeadline: '2026-10-16T18:00:00Z',
  createdAt: '2026-10-11T10:00:00Z',
  updatedAt: '2026-10-11T12:00:00Z',
};

describe('TicketFormMode', () => {
  it('renders ticket header, back button, and tabs', () => {
    render(
      <TicketFormMode
        ticket={mockTicket}
        layout="CASCADE"
        onBackToGrid={vi.fn()}
      />
    );

    expect(screen.getByTestId('ticket-form-mode')).toBeInTheDocument();
    expect(screen.getByText('AP-100001')).toBeInTheDocument();
    expect(screen.getAllByText('Aberto').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Alta').length).toBeGreaterThan(0);
    expect(screen.getByTestId('ticket-form-back-button')).toBeInTheDocument();
    expect(screen.getByText('Geral')).toBeInTheDocument();
    expect(screen.getByText('Atendimento & SLA')).toBeInTheDocument();
    expect(screen.getByText('Anexos & Tarefas')).toBeInTheDocument();
    expect(screen.getByText('Avaliação CSAT')).toBeInTheDocument();
  });

  it('allows editing title, status, priority, and saving', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <TicketFormMode
        ticket={mockTicket}
        layout="CASCADE"
        onSave={onSave}
        onBackToGrid={vi.fn()}
      />
    );

    const titleInput = screen.getByTestId('ticket-form-title-input');
    await user.clear(titleInput);
    await user.type(titleInput, 'Impressora corrigida');

    const statusSelect = screen.getByTestId('ticket-form-status-select');
    await user.selectOptions(statusSelect, 'IN_PROGRESS');

    const prioritySelect = screen.getByTestId('ticket-form-priority-select');
    await user.selectOptions(prioritySelect, 'CRITICAL');

    const saveBtn = screen.getByTestId('ticket-form-save-button');
    await user.click(saveBtn);

    expect(onSave).toHaveBeenCalledWith({
      title: 'Impressora corrigida',
      description: 'A impressora não está respondendo aos comandos de impressão.',
      status: 'IN_PROGRESS',
      priority: 'CRITICAL',
    });
  });

  it('switches tabs and displays SLA details', async () => {
    const user = userEvent.setup();
    render(
      <TicketFormMode
        ticket={mockTicket}
        layout="SIDE_BY_SIDE"
        onBackToGrid={vi.fn()}
      />
    );

    await user.click(screen.getByText('Atendimento & SLA'));
    expect(screen.getByText('Prazo SLA de Resposta')).toBeInTheDocument();
    expect(screen.getByText('Prazo SLA de Resolução')).toBeInTheDocument();
    expect(screen.getByText('agent-1')).toBeInTheDocument();
  });

  it('calls onBackToGrid when back button is clicked', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();

    render(
      <TicketFormMode
        ticket={mockTicket}
        layout="CASCADE"
        onBackToGrid={onBack}
      />
    );

    await user.click(screen.getByTestId('ticket-form-back-button'));
    expect(onBack).toHaveBeenCalled();
  });
});
