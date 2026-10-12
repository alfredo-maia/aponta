import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CompromissoDetailModal } from './CompromissoDetailModal';
import { Appointment } from '../../hooks/useAppointments';

const mockAppointment: Appointment = {
  id: 'app-100',
  title: 'ALUMIPREMIUM-CONFIGURAÇÕES BACKOFFICE',
  description: 'REALIZAR AS PARAMETRIZAÇÕES DE BACKOFFICE DA BASE',
  startTime: '2026-10-13T08:00:00.000Z',
  endTime: '2026-10-13T10:00:00.000Z',
  type: 'APPOINTMENT',
  organizationId: 'org-1',
  ticketId: 'tick-4650',
  userId: 'user-jg',
  createdAt: '2026-10-12T10:00:00.000Z',
  updatedAt: '2026-10-12T10:00:00.000Z',
  user: { id: 'user-jg', name: 'José Gomes', email: 'jg@aponta.com' },
  organization: { id: 'org-1', name: 'Alumipremium' },
  ticket: { id: 'tick-4650', title: 'Configurações', protocol: '4650' },
};

describe('CompromissoDetailModal', () => {
  it('renders compromisso details matching TiFlux card structure', () => {
    render(
      <CompromissoDetailModal
        isOpen={true}
        onClose={vi.fn()}
        appointment={mockAppointment}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText('Compromisso')).toBeInTheDocument();
    expect(screen.getByText('#4650 - ALUMIPREMIUM-CONFIGURAÇÕES BACKOFFICE')).toBeInTheDocument();
    expect(screen.getByText(/13\/10\/2026 - 13\/10\/2026/)).toBeInTheDocument();
    expect(screen.getByText('José Gomes')).toBeInTheDocument();
    expect(screen.getByText('0 minutos antes')).toBeInTheDocument();
    expect(screen.getByText('REALIZAR AS PARAMETRIZAÇÕES DE BACKOFFICE DA BASE')).toBeInTheDocument();
    expect(screen.getByText('Concluído')).toBeInTheDocument();
  });

  it('triggers onEdit callback when clicking edit icon', () => {
    const onEdit = vi.fn();
    const onClose = vi.fn();
    render(
      <CompromissoDetailModal
        isOpen={true}
        onClose={onClose}
        appointment={mockAppointment}
        onEdit={onEdit}
        onDelete={vi.fn()}
      />
    );

    const editBtn = screen.getByRole('button', { name: /editar/i });
    fireEvent.click(editBtn);

    expect(onClose).toHaveBeenCalled();
    expect(onEdit).toHaveBeenCalledWith(mockAppointment);
  });

  it('triggers onDelete callback when confirming deletion', async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <CompromissoDetailModal
        isOpen={true}
        onClose={onClose}
        appointment={mockAppointment}
        onEdit={vi.fn()}
        onDelete={onDelete}
      />
    );

    const deleteBtn = screen.getByRole('button', { name: /excluir/i });
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(onDelete).toHaveBeenCalledWith('app-100');
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('hides edit and delete buttons when canEdit is false', () => {
    render(
      <CompromissoDetailModal
        isOpen={true}
        onClose={vi.fn()}
        appointment={mockAppointment}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        canEdit={false}
      />
    );

    expect(screen.queryByRole('button', { name: /editar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /excluir/i })).not.toBeInTheDocument();
  });
});
