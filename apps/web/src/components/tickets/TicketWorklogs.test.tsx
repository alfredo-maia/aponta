import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import { TicketWorklogs, formatWorklogMinutes } from './TicketWorklogs';

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
    billable: false,
    ticketId: 't-1',
    authorId: 'u-2',
    createdAt: '2026-10-12T02:00:00.000Z',
    author: { id: 'u-2', name: 'Gestor Santos', email: 'santos@aponta.com' },
  },
];

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
        minutes: 30,
        description: 'Implementação de feature',
        billable: true,
      });
    });
  });

  it('quick chip buttons update the minutes value', async () => {
    loginAs('AGENT', 'u-1');
    vi.mocked(api.get).mockResolvedValueOnce({ data: [] });

    const user = userEvent.setup();
    renderComponent();

    const minutesInput = screen.getByTestId('worklog-minutes-input') as HTMLInputElement;
    expect(minutesInput.value).toBe('30');

    const chip1h = screen.getByRole('button', { name: '1h' });
    await user.click(chip1h);
    expect(minutesInput.value).toBe('60');

    const chip2h = screen.getByRole('button', { name: '2h' });
    await user.click(chip2h);
    expect(minutesInput.value).toBe('120');
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
