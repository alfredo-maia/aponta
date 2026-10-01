import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PublicCsatPage } from './PublicCsatPage';
import { api } from '../lib/api';

vi.mock('../lib/api', () => ({
  api: {
    get: vi.fn(),
    patch: vi.fn(),
  },
}));

function renderPage(token = 'tok-abc-123') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/avaliar/${token}`]}>
        <Routes>
          <Route path="/avaliar/:token" element={<PublicCsatPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('PublicCsatPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the ticket summary and 5 stars pre-selected', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        protocol: '2026-0001',
        title: 'Impressora não funciona',
        score: null,
        comment: null,
      },
    });

    renderPage();

    await waitFor(() =>
      expect(screen.getByText(/2026-0001/)).toBeInTheDocument(),
    );
    expect(screen.getByText(/Impressora não funciona/)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /confirmar avaliação/i }),
    ).toBeInTheDocument();
  });

  it('shows an invalid-link message when the token does not resolve (404)', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockRejectedValue({
      isAxiosError: true,
      response: { status: 404 },
    });

    renderPage('bad-token');

    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: /link inválido/i }),
      ).toBeInTheDocument(),
    );
  });

  it('does NOT submit the rating automatically on page load — only after clicking Confirmar', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        protocol: '2026-0001',
        title: 'Impressora não funciona',
        score: null,
        comment: null,
      },
    });

    renderPage();

    await waitFor(() =>
      expect(screen.getByText(/2026-0001/)).toBeInTheDocument(),
    );

    expect(api.patch).not.toHaveBeenCalled();
  });

  it('submits the chosen score+comment only when Confirmar is clicked', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        protocol: '2026-0001',
        title: 'Impressora não funciona',
        score: null,
        comment: null,
      },
    });
    (api.patch as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { id: 'ticket-1', csatScore: 4, csatComment: 'Bom atendimento' },
    });

    const user = userEvent.setup();
    renderPage();

    await waitFor(() =>
      expect(screen.getByText(/2026-0001/)).toBeInTheDocument(),
    );

    await user.click(screen.getByRole('button', { name: '4 estrelas' }));
    await user.type(
      screen.getByLabelText(/comentário/i),
      'Bom atendimento',
    );
    await user.click(
      screen.getByRole('button', { name: /confirmar avaliação/i }),
    );

    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith('/public/csat/tok-abc-123', {
        score: 4,
        comment: 'Bom atendimento',
      }),
    );
    await waitFor(() =>
      expect(screen.getByText(/obrigado/i)).toBeInTheDocument(),
    );
  });

  it('shows the already-rated confirmation when the ticket was already rated', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        protocol: '2026-0001',
        title: 'Impressora não funciona',
        score: 5,
        comment: 'Excelente',
      },
    });

    renderPage();

    await waitFor(() =>
      expect(screen.getByText(/já foi avaliado/i)).toBeInTheDocument(),
    );
    expect(
      screen.queryByRole('button', { name: /confirmar avaliação/i }),
    ).not.toBeInTheDocument();
  });
});
