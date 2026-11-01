import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PublicKnowledgeArticlePage } from './PublicKnowledgeArticlePage';
import { api } from '../lib/api';

vi.mock('../lib/api', () => ({
  api: {
    get: vi.fn(),
  },
}));

function renderPage(articleId = 'a-1') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/r/knowledge/${articleId}`]}>
        <Routes>
          <Route path="/r/knowledge/:articleId" element={<PublicKnowledgeArticlePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('PublicKnowledgeArticlePage (AC-07, AC-08)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a loading state while fetching', () => {
    (api.get as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => undefined));

    renderPage();

    expect(screen.getByText(/carregando/i)).toBeInTheDocument();
  });

  it('renders the sanitized content as real DOM nodes, plus its attachments as authenticated download links', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        id: 'a-1',
        title: 'Como abrir um chamado',
        content: '<p>Clique em <strong>Novo Chamado</strong></p>',
        folder: { id: 'f-1', name: 'Suporte', icon: '🛟' },
        tags: ['ajuda'],
        updatedAt: '2026-01-01T00:00:00.000Z',
        attachments: [{ id: 'att-1', originalName: 'manual.pdf', mimeType: 'application/pdf' }],
      },
    });

    renderPage();

    await waitFor(() =>
      expect(screen.getByText('Como abrir um chamado')).toBeInTheDocument(),
    );
    const strong = screen.getByText('Novo Chamado');
    expect(strong.tagName).toBe('STRONG');

    const link = screen.getByRole('link', { name: /manual\.pdf/i });
    expect(link).toHaveAttribute(
      'href',
      '/api/articles/a-1/attachments/att-1/download',
    );
  });

  it('shows a uniform "não encontrado" message for a 404 (PRIVATE or nonexistent — portal can\'t tell, by design)', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockRejectedValue({
      isAxiosError: true,
      response: { status: 404 },
    });

    renderPage();

    await waitFor(() => expect(screen.getByText(/não encontrado/i)).toBeInTheDocument());
  });

  it('shows a generic error state for a non-404 failure', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('network'));

    renderPage();

    await waitFor(() =>
      expect(screen.getByText(/não foi possível carregar/i)).toBeInTheDocument(),
    );
  });
});
