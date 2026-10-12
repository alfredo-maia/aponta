import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import { TicketWorklogs, formatWorklogMinutes, formatAttendanceType } from './TicketWorklogs';

vi.mock('../../lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockWorklogs = [
  {
    id: 'wl-1',
    description: 'Diagnóstico e análise',
    minutes: 60,
    startTime: '2026-10-12T08:00:00.000Z',
    endTime: '2026-10-12T09:00:00.000Z',
    attendanceType: 'REMOTE',
    billable: true,
    ticketId: 't-1',
    authorId: 'u-1',
    createdAt: '2026-10-12T01:00:00.000Z',
    author: { id: 'u-1', name: 'Técnico Silva', email: 'silva@aponta.com' },
  },
  {
    id: 'wl-2',
    description: 'Reunião interna sobre escopo',
    minutes: 30,
    startTime: '2026-10-12T14:00:00.000Z',
    endTime: '2026-10-12T14:30:00.000Z',
    attendanceType: 'ON_SITE',
    billable: false,
    ticketId: 't-1',
    authorId: 'u-2',
    createdAt: '2026-10-12T02:00:00.000Z',
    author: { id: 'u-2', name: 'Gestor Santos', email: 'santos@aponta.com' },
  },
];

const todayStr = () => new Date().toISOString().split('T')[0];

function renderComponent(ticketId = 't-1') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <TicketWorklogs ticketId={ticketId} />
    </QueryClientProvider>,
  );
}

function loginAs(role: 'ADMIN' | 'AGENT' | 'CLIENT', id = 'u-1') {
  useAuthStore.setState({
    token: 'fake-token',
    user: {
      sub: id,
      email: 'user@aponta.com',
      role,
    },
  });
}

describe('TicketWorklogs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ token: null, user: null });
  });

  it('formatWorklogMinutes formats minutes into human readable text', () => {
    expect(formatWorklogMinutes(30)).toBe('30 min');
    expect(formatWorklogMinutes(60)).toBe('1h');
    expect(formatWorklogMinutes(90)).toBe('1h 30m');
    expect(formatWorklogMinutes(125)).toBe('2h 5m');
  });

  it('formatAttendanceType translates the attendance type enum', () => {
    expect(formatAttendanceType('REMOTE')).toBe('Remoto');
    expect(formatAttendanceType('ON_SITE')).toBe('Presencial');
  });

  it('renders worklogs list and summary header correctly', async () => {
    loginAs('AGENT', 'u-1');
    vi.mocked(api.get).mockResolvedValueOnce({ data: mockWorklogs });

    renderComponent();

    expect(screen.getByTestId('ticket-worklogs-section')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Diagnóstico e análise')).toBeInTheDocument();
      expect(screen.getByText('Reunião interna sobre escopo')).toBeInTheDocument();
    });

    expect(screen.getByText('1h 30m')).toBeInTheDocument(); // total 90m
    expect(screen.getByText('Faturável')).toBeInTheDocument();
    expect(screen.getByText('Não Faturável')).toBeInTheDocument();
    expect(within(screen.getByTestId('worklog-item-wl-1')).getByText('Remoto')).toBeInTheDocument();
    expect(within(screen.getByTestId('worklog-item-wl-2')).getByText('Presencial')).toBeInTheDocument();
  });

  it('renders empty state when no worklogs exist', async () => {
    loginAs('AGENT', 'u-1');
    vi.mocked(api.get).mockResolvedValueOnce({ data: [] });

    renderComponent();

    await waitFor(() => {
      expect(
        screen.getByText('Nenhum apontamento de horas registrado neste chamado até o momento.'),
      ).toBeInTheDocument();
    });
  });

  it('allows filling the form and submitting a new worklog', async () => {
    loginAs('AGENT', 'u-1');
    vi.mocked(api.get).mockResolvedValueOnce({ data: [] });
    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        id: 'wl-new',
        description: 'Implementação de feature',
        minutes: 45,
        billable: true,
        author: { id: 'u-1', name: 'Usuário Teste' },
      },
    });

    const user = userEvent.setup();
    renderComponent();

    const descInput = screen.getByTestId('worklog-description-input');
    await user.type(descInput, 'Implementação de feature');

    fireEvent.submit(screen.getByTestId('worklog-form'));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/tickets/t-1/worklogs', {
        startTime: `${todayStr()}T08:00:00Z`,
        endTime: `${todayStr()}T08:30:00Z`,
        attendanceType: 'REMOTE',
        description: 'Implementação de feature',
        billable: true,
      });
    });
  });

  it('allows choosing attendance type and a custom time range, sending them on submit', async () => {
    loginAs('AGENT', 'u-1');
    vi.mocked(api.get).mockResolvedValueOnce({ data: [] });
    vi.mocked(api.post).mockResolvedValueOnce({
      data: { id: 'wl-new', description: 'Visita técnica', minutes: 120, billable: true, author: { id: 'u-1', name: 'Usuário Teste' } },
    });

    const user = userEvent.setup();
    renderComponent();

    await user.type(screen.getByTestId('worklog-description-input'), 'Visita técnica');
    await user.selectOptions(screen.getByTestId('worklog-attendance-type-select'), 'ON_SITE');

    const startInput = screen.getByTestId('worklog-start-time-input') as HTMLInputElement;
    fireEvent.change(startInput, { target: { value: '09:00' } });

    const endInput = screen.getByTestId('worklog-end-time-input') as HTMLInputElement;
    fireEvent.change(endInput, { target: { value: '11:00' } });

    fireEvent.submit(screen.getByTestId('worklog-form'));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/tickets/t-1/worklogs', {
        startTime: `${todayStr()}T09:00:00Z`,
        endTime: `${todayStr()}T11:00:00Z`,
        attendanceType: 'ON_SITE',
        description: 'Visita técnica',
        billable: true,
      });
    });
  });

  it('blocks submission when the end time is not after the start time', async () => {
    loginAs('AGENT', 'u-1');
    vi.mocked(api.get).mockResolvedValueOnce({ data: [] });

    const user = userEvent.setup();
    renderComponent();

    await user.type(screen.getByTestId('worklog-description-input'), 'Horário inválido');
    fireEvent.change(screen.getByTestId('worklog-start-time-input'), { target: { value: '10:00' } });
    fireEvent.change(screen.getByTestId('worklog-end-time-input'), { target: { value: '09:00' } });

    fireEvent.submit(screen.getByTestId('worklog-form'));

    await waitFor(() => {
      expect(screen.getByText('O horário de término deve ser posterior ao horário de início.')).toBeInTheDocument();
    });
    expect(api.post).not.toHaveBeenCalled();
  });

  it('quick chip buttons update the end time and the computed duration', async () => {
    loginAs('AGENT', 'u-1');
    vi.mocked(api.get).mockResolvedValueOnce({ data: [] });

    const user = userEvent.setup();
    renderComponent();

    const endInput = screen.getByTestId('worklog-end-time-input') as HTMLInputElement;
    expect(endInput.value).toBe('08:30');
    expect(screen.getByTestId('worklog-computed-duration')).toHaveTextContent('30 min');

    const chip1h = screen.getByRole('button', { name: '1h' });
    await user.click(chip1h);
    expect(endInput.value).toBe('09:00');
    expect(screen.getByTestId('worklog-computed-duration')).toHaveTextContent('1h');

    const chipExtend = screen.getByRole('button', { name: '+15m' });
    await user.click(chipExtend);
    expect(endInput.value).toBe('09:15');
    expect(screen.getByTestId('worklog-computed-duration')).toHaveTextContent('1h 15m');
  });

  it('allows deleting own worklog when confirmed', async () => {
    loginAs('AGENT', 'u-1');
    vi.mocked(api.get).mockResolvedValueOnce({ data: mockWorklogs });
    vi.mocked(api.delete).mockResolvedValueOnce({ data: { id: 'wl-1' } });
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('worklog-delete-button-wl-1')).toBeInTheDocument();
    });

    // wl-2 was created by u-2, so u-1 (AGENT) cannot delete it
    expect(screen.queryByTestId('worklog-delete-button-wl-2')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('worklog-delete-button-wl-1'));

    expect(window.confirm).toHaveBeenCalled();
    expect(api.delete).toHaveBeenCalledWith('/tickets/t-1/worklogs/wl-1');
  });
});
