import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PublicKnowledgePage } from './PublicKnowledgePage';
import { api } from '../lib/api';

vi.mock('../lib/api', () => ({
  api: {
    get: vi.fn(),
  },
}));

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/r/knowledge']}>
        <Routes>
          <Route path="/r/knowledge" element={<PublicKnowledgePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('PublicKnowledgePage (AC-07, AC-08)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a loading state while fetching', () => {
    (api.get as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => undefined));

    renderPage();

    expect(screen.getByText(/carregando/i)).toBeInTheDocument();
  });

  it('lists PUBLIC articles grouped by folder, each linking to /r/knowledge/:id', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockImplementation((path: string) => {
      if (path.startsWith('/public/knowledge/folders')) {
        return Promise.resolve({ data: [{ id: 'f-1', name: 'Suporte', icon: '🛟', articleCount: 1 }] });
      }
      return Promise.resolve({
        data: [
          {
            id: 'a-1',
            title: 'Como abrir um chamado',
            content: '<p>texto</p>',
            folder: { id: 'f-1', name: 'Suporte', icon: '🛟' },
            tags: [],
            updatedAt: '2026-01-01T00:00:00.000Z',
            attachments: [],
          },
        ],
      });
    });

    renderPage();

    await waitFor(() => expect(screen.getByText('Suporte')).toBeInTheDocument());
    const link = screen.getByRole('link', { name: /como abrir um chamado/i });
    expect(link).toHaveAttribute('href', '/r/knowledge/a-1');
  });

  it('shows an empty state when there are no public articles', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [] });

    renderPage();

    await waitFor(() => expect(screen.getByText(/nenhum conte(ú|u)do publicado/i)).toBeInTheDocument());
  });

  it('shows an error state when the API call fails', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('network'));

    renderPage();

    await waitFor(() =>
      expect(screen.getByText(/não foi possível carregar/i)).toBeInTheDocument(),
    );
  });

  it('never links to the internal /knowledge panel (AC-08: no path back for anonymous visitors)', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [] });

    const { container } = renderPage();

    await waitFor(() => expect(screen.getByText(/nenhum conte(ú|u)do publicado/i)).toBeInTheDocument());
    expect(container.querySelector('a[href="/knowledge"]')).toBeNull();
  });
});
