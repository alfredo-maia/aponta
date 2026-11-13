import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReleasesPage, ReleasesRoute } from './ReleasesPage';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

vi.mock('../lib/api', () => ({ api: { get: vi.fn(), post: vi.fn() } }));

const row = (id: string, name: string) => ({
  id, approvalType: 'LANCAMENTO', approvalStatus: 'PENDING', minutes: 60, approvalReason: 'Motivo ' + id,
  startTime: '2026-11-12T11:10:00.000Z', endTime: '2026-11-12T12:10:00.000Z', ticketId: 't-' + id,
  ticket: { id: 't-' + id, protocol: 'T-' + id, title: 'Erro' }, author: { id: 'u-' + id, name, email: name + '@aponta.test' },
});

const client = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe('achados do code-review do T5 na tela (DMTE-462)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ token: 'fake-token', user: { sub: 'u-1', email: 'g@aponta.com', role: 'AGENT' } });
  });

  it('AC-30: depois de liberar, a seleção some e Liberar e Negar selecionado voltam a ficar desativados', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: [row('w-1', 'Ana'), row('w-2', 'Bia')] }).mockResolvedValue({ data: [row('w-2', 'Bia')] });
    vi.mocked(api.post).mockResolvedValue({ data: {} });
    render(<QueryClientProvider client={client()}><MemoryRouter><ReleasesPage /></MemoryRouter></QueryClientProvider>);
    await screen.findByText('Ana');
    await userEvent.click(within(screen.getByText('Ana').closest('tr') as HTMLElement).getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: 'Liberar selecionado' }));
    await waitFor(() => expect(screen.queryByText('Ana')).not.toBeInTheDocument());
    expect(screen.getByText('Bia')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Liberar selecionado' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Negar selecionado' })).toBeDisabled();
  });

  describe('AC-30: a rota /releases só abre para quem tem permissão de liberar', () => {
    const renderRoute = () => render(
      <QueryClientProvider client={client()}>
        <MemoryRouter initialEntries={['/releases']}>
          <Routes>
            <Route path="/" element={<div>Início</div>} />
            <Route path="/releases" element={<ReleasesRoute />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    it('sem a permissão, volta para o início sem carregar a lista', async () => {
      vi.mocked(api.get).mockImplementation(async (url: string) => ({ data: url === '/auth/me' ? { id: 'u-1', isAdmin: true, permissions: [], canReleaseWorklogs: false } : [] }));
      renderRoute();
      expect(await screen.findByText('Início')).toBeInTheDocument();
      expect(api.get).not.toHaveBeenCalledWith('/worklog-approvals');
    });

    it('com a permissão, abre a tela', async () => {
      vi.mocked(api.get).mockImplementation(async (url: string) => ({ data: url === '/auth/me' ? { id: 'u-1', isAdmin: false, permissions: [], canReleaseWorklogs: true } : [] }));
      renderRoute();
      expect(await screen.findByText('Nenhuma liberação pendente.')).toBeInTheDocument();
    });
  });
});
