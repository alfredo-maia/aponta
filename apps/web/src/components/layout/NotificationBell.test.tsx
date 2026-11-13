import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationBell } from './NotificationBell';
import { api } from '../../lib/api';

vi.mock('../../lib/api', () => ({ api: { get: vi.fn(), post: vi.fn() } }));

const note = (over: Record<string, unknown> = {}) => ({
  id: 'n-1', type: 'WORKLOG_AUTOCLOSE', title: 'Cronômetro encerrado automaticamente: ticket T-1001', body: 'O cronômetro de Ana foi encerrado.',
  link: '/tickets/t-1', readAt: null, createdAt: '2026-11-13T10:00:00.000Z', ...over,
});

function stubApi(flag: boolean, payload = { unread: 2, items: [note(), note({ id: 'n-2', title: 'Liberação pendente: Lançamento no ticket T-1002', link: '/releases' }), note({ id: 'n-3', title: 'Apontamento liberado: ticket T-1003', readAt: '2026-11-13T11:00:00.000Z', link: '/tickets/t-3' })] }) {
  vi.mocked(api.get).mockImplementation(async (url: string) => {
    if (url === '/feature-flags') return { data: { 'sino-notificacoes': flag } };
    if (url === '/notifications') return { data: payload };
    throw new Error('url inesperada ' + url);
  });
  vi.mocked(api.post).mockResolvedValue({ data: {} });
}

const calls = (url: string) => vi.mocked(api.get).mock.calls.filter(([u]) => u === url).length;

function renderBell() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/']}>
        <NotificationBell />
        <Routes>
          <Route path="/" element={<div>Início</div>} />
          <Route path="/tickets/:id" element={<div>Página do ticket</div>} />
          <Route path="/releases" element={<div>Página de liberações</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('NotificationBell (DMTE-462 T6)', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.useRealTimers());

  it('AC-35: com a flag sino-notificacoes desligada o sino some e a lista nem é pedida', async () => {
    stubApi(false);
    renderBell();
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/feature-flags'));
    expect(screen.queryByRole('button', { name: /Notificações/ })).not.toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalledWith('/notifications');
  });

  it('AC-34: com a flag ligada mostra o contador das não lidas que a API devolveu', async () => {
    stubApi(true);
    renderBell();
    expect(await screen.findByTestId('notification-count')).toHaveTextContent('2');
  });

  it('AC-34: clicar numa não lida marca como lida e leva ao ticket', async () => {
    stubApi(true);
    renderBell();
    await userEvent.click(await screen.findByRole('button', { name: /Notificações/ }));
    await userEvent.click(screen.getByText(/ticket T-1001/));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/notifications/n-1/read'));
    expect(await screen.findByText('Página do ticket')).toBeInTheDocument();
  });

  it('AC-34: a de liberação pendente leva à tela Liberações', async () => {
    stubApi(true);
    renderBell();
    await userEvent.click(await screen.findByRole('button', { name: /Notificações/ }));
    await userEvent.click(screen.getByText(/Liberação pendente/));
    expect(await screen.findByText('Página de liberações')).toBeInTheDocument();
  });

  it('AC-34: clicar numa já lida só navega, sem marcar de novo', async () => {
    stubApi(true);
    renderBell();
    await userEvent.click(await screen.findByRole('button', { name: /Notificações/ }));
    await userEvent.click(screen.getByText(/ticket T-1003/));
    expect(await screen.findByText('Página do ticket')).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('AC-34: "Marcar todas como lidas" chama a API de marcar todas', async () => {
    stubApi(true);
    renderBell();
    await userEvent.click(await screen.findByRole('button', { name: /Notificações/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Marcar todas como lidas' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/notifications/read-all'));
  });

  it('AC-34: abrir o painel atualiza a lista', async () => {
    stubApi(true);
    renderBell();
    await screen.findByTestId('notification-count');
    expect(calls('/notifications')).toBe(1);
    await userEvent.click(screen.getByRole('button', { name: /Notificações/ }));
    await waitFor(() => expect(calls('/notifications')).toBe(2));
  });

  it('AC-34: o contador atualiza sozinho a cada 60 segundos', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    stubApi(true);
    renderBell();
    await screen.findByTestId('notification-count');
    expect(calls('/notifications')).toBe(1);
    await vi.advanceTimersByTimeAsync(59_000);
    expect(calls('/notifications')).toBe(1);
    await vi.advanceTimersByTimeAsync(2_000);
    await waitFor(() => expect(calls('/notifications')).toBe(2));
  });

  it('AC-34: falha ao carregar mostra o erro dentro do painel', async () => {
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/feature-flags') return { data: { 'sino-notificacoes': true } };
      throw new Error('500');
    });
    renderBell();
    await userEvent.click(await screen.findByRole('button', { name: /Notificações/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Erro ao carregar as notificações.');
  });
});
