import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReleasesPage } from './ReleasesPage';
import { api } from '../lib/api';

vi.mock('../lib/api', () => ({ api: { get: vi.fn(), post: vi.fn() } }));

const ROWS = [
  {
    id: 'w-1', approvalType: 'LANCAMENTO', approvalStatus: 'PENDING', minutes: 60,
    approvalReason: 'O início 12/11 08:10 não cai na janela de nenhuma agenda deste ticket. A regra: o lançamento manual precisa começar dentro da janela.',
    startTime: '2026-11-12T11:10:00.000Z', endTime: '2026-11-12T12:10:00.000Z', ticketId: 't-1',
    ticket: { id: 't-1', protocol: 'T-1001', title: 'Erro no ERP' }, author: { id: 'u-2', name: 'Ana Consultora', email: 'ana@aponta.test' },
  },
  {
    id: 'w-2', approvalType: 'CRONOMETRO_ENCERRADO', approvalStatus: 'PENDING', minutes: 240,
    approvalReason: 'O sistema encerrou este cronômetro sozinho porque o tempo trabalhado chegou aos 240 min da agenda.',
    startTime: '2026-11-12T11:00:00.000Z', endTime: '2026-11-12T15:00:00.000Z', ticketId: 't-2',
    ticket: { id: 't-2', protocol: 'T-1002', title: 'Impressora parada' }, author: { id: 'u-3', name: 'Bia Consultora', email: 'bia@aponta.test' },
  },
];

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ReleasesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ReleasesPage (DMTE-462 T5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockResolvedValue({ data: ROWS });
    vi.mocked(api.post).mockResolvedValue({ data: {} });
  });

  it('AC-30: lista os pendentes no grid do DS, com consultor, ticket, tipo e motivo', async () => {
    renderPage();
    expect(await screen.findByText('Ana Consultora')).toBeInTheDocument();
    expect(screen.getByText('Bia Consultora')).toBeInTheDocument();
    expect(screen.getByText('T-1001')).toBeInTheDocument();
    expect(screen.getByText('Lançamento')).toBeInTheDocument();
    expect(screen.getByText('Cronômetro encerrado')).toBeInTheDocument();
    expect(screen.getByText(/não cai na janela/i)).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/worklog-approvals');
  });

  it('AC-30: não oferece incluir nem excluir', async () => {
    renderPage();
    await screen.findByText('Ana Consultora');
    expect(screen.queryByRole('button', { name: /novo|incluir|adicionar|excluir|remover|apagar/i })).not.toBeInTheDocument();
  });

  it('AC-30: sem linha selecionada, Liberar e Negar ficam desativados', async () => {
    renderPage();
    await screen.findByText('Ana Consultora');
    expect(screen.getByRole('button', { name: 'Liberar selecionado' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Negar selecionado' })).toBeDisabled();
  });

  it('AC-30: o duplo clique abre a decisão com o motivo completo, e Liberar chama a API', async () => {
    renderPage();
    fireEvent.doubleClick(await screen.findByText('Ana Consultora'));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/A regra: o lançamento manual precisa começar dentro da janela/i)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Liberar' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/worklog-approvals/w-1/approve'));
  });

  it('AC-30: com uma linha selecionada, Liberar selecionado decide só ela', async () => {
    renderPage();
    await screen.findByText('Ana Consultora');
    const row = screen.getByText('Bia Consultora').closest('tr') as HTMLElement;
    await userEvent.click(within(row).getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: 'Liberar selecionado' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/worklog-approvals/w-2/approve'));
    expect(api.post).toHaveBeenCalledTimes(1);
  });

  it('AC-30: negar pede o motivo, não envia sem ele e envia com ele', async () => {
    renderPage();
    await screen.findByText('Ana Consultora');
    const row = screen.getByText('Ana Consultora').closest('tr') as HTMLElement;
    await userEvent.click(within(row).getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: 'Negar selecionado' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Confirmar negação' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(/motivo/i);
    expect(api.post).not.toHaveBeenCalled();
    await userEvent.type(within(dialog).getByLabelText('Motivo da negação'), 'Horário não confere com o atendimento');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Confirmar negação' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/worklog-approvals/w-1/reject', { note: 'Horário não confere com o atendimento' }));
  });

  it('AC-25: erro do servidor na decisão aparece na própria janela', async () => {
    vi.mocked(api.post).mockRejectedValue({ response: { data: { message: 'Ninguém libera o próprio apontamento' } } });
    renderPage();
    fireEvent.doubleClick(await screen.findByText('Ana Consultora'));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Liberar' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Ninguém libera o próprio apontamento');
  });

  it('AC-30: lista vazia e falha de carga têm mensagens próprias', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [] });
    const vazia = renderPage();
    expect(await screen.findByText('Nenhuma liberação pendente.')).toBeInTheDocument();
    vazia.unmount();
    vi.mocked(api.get).mockRejectedValue(new Error('403'));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent(/erro ao carregar/i);
  });
});
