import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ScheduledJobsPage } from './ScheduledJobsPage';
import { api } from '../lib/api';

vi.mock('../lib/api', () => ({
  api: { get: vi.fn(), patch: vi.fn() },
}));

const JOBS = [
  {
    type: 'HEARTBEAT',
    cron: '* * * * *',
    enabled: true,
    nextRunAt: '2026-11-11T12:01:00.000Z',
    lastRunAt: '2026-11-11T12:00:00.000Z',
    failures: 1,
    runs: [
      { id: 'r-2', status: 'FAILED', attempt: 2, startedAt: '2026-11-11T12:00:00.000Z', finishedAt: '2026-11-11T12:00:01.000Z', error: 'Tempo esgotado' },
      { id: 'r-1', status: 'SUCCESS', attempt: 1, startedAt: '2026-11-11T11:59:00.000Z', finishedAt: '2026-11-11T11:59:01.000Z', error: null },
    ],
  },
];

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ScheduledJobsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ScheduledJobsPage (DMTE-462 T3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockResolvedValue({ data: JOBS });
    vi.mocked(api.patch).mockResolvedValue({ data: JOBS[0] });
  });

  it('AC-16: lista a tarefa com o cron atual, a próxima e a última execução', async () => {
    renderPage();
    expect(await screen.findByText('Verificação do agendador')).toBeInTheDocument();
    expect(screen.getByLabelText('Cron de Verificação do agendador')).toHaveValue('* * * * *');
    expect(screen.getByText(/próxima execução/i)).toBeInTheDocument();
    expect(screen.getByText(/última execução/i)).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/scheduled-jobs');
  });

  it('AC-16: mostra as execuções recentes com estado, tentativa e erro', async () => {
    renderPage();
    await screen.findByText('Verificação do agendador');
    expect(screen.getByText('Falhou')).toBeInTheDocument();
    expect(screen.getByText('Sucesso')).toBeInTheDocument();
    expect(screen.getByText('Tempo esgotado')).toBeInTheDocument();
  });

  it('AC-15: editar o cron e salvar envia só o cron daquele tipo', async () => {
    const user = userEvent.setup();
    renderPage();
    const input = await screen.findByLabelText('Cron de Verificação do agendador');
    await user.clear(input);
    await user.type(input, '*/5 * * * *');
    await user.click(screen.getByRole('button', { name: 'Salvar cron de Verificação do agendador' }));
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/scheduled-jobs/HEARTBEAT', { cron: '*/5 * * * *' }));
  });

  it('AC-15: cron recusado pelo servidor mostra a mensagem dele', async () => {
    vi.mocked(api.patch).mockRejectedValue({ response: { data: { message: 'Expressão cron inválida' } } });
    const user = userEvent.setup();
    renderPage();
    const input = await screen.findByLabelText('Cron de Verificação do agendador');
    await user.clear(input);
    await user.type(input, 'abc');
    await user.click(screen.getByRole('button', { name: 'Salvar cron de Verificação do agendador' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Expressão cron inválida');
  });

  it('AC-15: o interruptor ativa e desativa a tarefa', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByLabelText('Ativa: Verificação do agendador'));
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/scheduled-jobs/HEARTBEAT', { enabled: false }));
  });
});
