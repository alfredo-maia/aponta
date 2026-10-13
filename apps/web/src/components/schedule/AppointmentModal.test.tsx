import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AppointmentModal } from './AppointmentModal';
import { Appointment } from '../../hooks/useAppointments';
import { api } from '../../lib/api';

vi.mock('../../lib/api', () => ({
  api: {
    // Discriminate by URL: /organizations and /service-desks return plain
    // arrays (real shape), /tickets returns the paginated {data, meta} shape.
    // A one-size-fits-all mock previously masked a real "`.map` is not a
    // function" crash when a non-array endpoint was called through a mock
    // shaped for the other endpoint.
    get: vi.fn().mockImplementation((url: string) => {
      if (url === '/organizations' || url === '/service-desks') {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 1 } } });
    }),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockAppointment: Appointment = {
  id: 'app-1',
  title: 'Reunião de Alinhamento',
  description: 'Discussão sobre escopo',
  startTime: '2026-10-15T10:00:00.000Z',
  endTime: '2026-10-15T11:00:00.000Z',
  type: 'AGENDA',
  organizationId: 'org-1',
  ticketId: 'tick-1',
  userId: 'user-1',
  createdAt: '2026-10-14T10:00:00.000Z',
  updatedAt: '2026-10-14T10:00:00.000Z',
  user: { id: 'user-1', name: 'Técnico Silva', email: 'silva@dmtecnologia.com.br' },
  organization: { id: 'org-1', name: 'Empresa Teste' },
  ticket: { id: 'tick-1', title: 'Chamado 1', protocol: 'T-1001', requester: { id: 'req-1', name: 'Cliente Teste', email: 'cliente@empresa.com' } },
};

function renderModal(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('AppointmentModal', () => {
  it('renders creation mode with initial fields', () => {
    renderModal(
      <AppointmentModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
        initialDate="2026-10-15"
      />
    );

    expect(screen.getByText('Novo Agendamento')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ex: Reunião com cliente, Atendimento remoto...')).toHaveValue('');
  });

  it('validates required title before saving', async () => {
    const onSave = vi.fn();
    renderModal(
      <AppointmentModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={onSave}
      />
    );

    const submitBtn = screen.getByRole('button', { name: /^Salvar$/i });
    fireEvent.click(submitBtn);

    expect(screen.getByText('O título é obrigatório')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('validates that end time is after start time', async () => {
    const onSave = vi.fn();
    renderModal(
      <AppointmentModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={onSave}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('Ex: Reunião com cliente, Atendimento remoto...'), {
      target: { value: 'Atendimento' },
    });

    const timeInputs = screen.getAllByDisplayValue(/\d{2}:\d{2}/);
    // start time
    fireEvent.change(timeInputs[0], { target: { value: '14:00' } });
    // end time
    fireEvent.change(timeInputs[1], { target: { value: '13:00' } });

    const submitBtn = screen.getByRole('button', { name: /^Salvar$/i });
    fireEvent.click(submitBtn);

    expect(screen.getByText('A data/hora de término deve ser posterior ao início')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('submits a new appointment successfully', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    renderModal(
      <AppointmentModal
        isOpen={true}
        onClose={onClose}
        onSave={onSave}
        initialDate="2026-10-15"
      />
    );

    fireEvent.change(screen.getByPlaceholderText('Ex: Reunião com cliente, Atendimento remoto...'), {
      target: { value: 'Deploy da Release' },
    });
    fireEvent.change(screen.getByPlaceholderText('Detalhes ou pauta do compromisso...'), {
      target: { value: 'Subir versão homologada' },
    });

    const submitBtn = screen.getByRole('button', { name: /^Salvar$/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Deploy da Release',
          description: 'Subir versão homologada',
        })
      );
    });
  });

  it('renders edit mode with existing appointment and allows delete', async () => {
    const onSave = vi.fn();
    const onDelete = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderModal(
      <AppointmentModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={onSave}
        onDelete={onDelete}
        appointment={mockAppointment}
      />
    );

    expect(screen.getByText('Editar Compromisso')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Reunião de Alinhamento')).toBeInTheDocument();

    const deleteBtn = screen.getByRole('button', { name: /Excluir/i });
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(onDelete).toHaveBeenCalledWith('app-1');
    });
  });

  it('shows the linked ticket and requester, with an option to unlink', () => {
    renderModal(
      <AppointmentModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
        appointment={mockAppointment}
      />
    );

    expect(screen.getByText('#T-1001')).toBeInTheDocument();
    expect(screen.getByText('Chamado 1')).toBeInTheDocument();
    expect(screen.getByText('Cliente Teste')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /desvincular chamado/i }));

    expect(screen.queryByText('#T-1001')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /buscar chamado por protocolo/i })).toBeInTheDocument();
  });

  it('opens the ticket search modal with Cliente/Mesa filters and links the selected ticket', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/organizations') {
        return Promise.resolve({ data: [{ id: 'org-9', name: 'Acme Corp' }] });
      }
      if (url === '/service-desks') {
        return Promise.resolve({ data: [{ id: 'sd-1', name: 'Suporte N1' }] });
      }
      return Promise.resolve({
        data: {
          data: [{ id: 'tick-9', protocol: 'T-9', title: 'Chamado de teste', description: 'Detalhe do chamado de teste', status: 'OPEN' }],
          meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
        },
      });
    });

    renderModal(
      <AppointmentModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
        initialDate="2026-10-15"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /buscar chamado por protocolo/i }));

    expect(screen.getByText('Buscar Chamado')).toBeInTheDocument();
    expect(await screen.findByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Suporte N1')).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(/buscar por protocolo, título ou descrição/i);
    fireEvent.change(searchInput, { target: { value: 'teste' } });

    await waitFor(
      () => {
        expect(api.get).toHaveBeenCalledWith('/tickets', expect.objectContaining({
          params: expect.objectContaining({ search: 'teste', notClosed: 'true' }),
        }));
      },
      { timeout: 2000 }
    );

    const option = await screen.findByText('Chamado de teste');
    fireEvent.click(option);

    expect(screen.queryByText('Buscar Chamado')).not.toBeInTheDocument();
    expect(screen.getByText('#T-9')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Chamado de teste')).toBeInTheDocument();
  });

  it('disables actions when canEdit is false', () => {
    renderModal(
      <AppointmentModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
        appointment={mockAppointment}
        canEdit={false}
      />
    );

    expect(screen.queryByRole('button', { name: /^Salvar$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Excluir/i })).not.toBeInTheDocument();
  });
});
