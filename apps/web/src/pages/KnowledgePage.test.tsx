import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { KnowledgePage } from './KnowledgePage';

vi.mock('../lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const articles = [
  {
    id: 'article-1',
    title: 'Como abrir um chamado',
    content: 'Clique em Novo Chamado...',
    isPublic: true,
    tags: [],
  },
];

function mockApiGet() {
  vi.mocked(api.get).mockImplementation((url: string) => {
    if (url === '/articles') {
      return Promise.resolve({ data: articles });
    }
    return Promise.reject(new Error(`Unexpected GET ${url}`));
  });
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/knowledge']}>
        <Routes>
          <Route path="/knowledge" element={<KnowledgePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function loginAs(role: 'ADMIN' | 'AGENT' | 'CLIENT') {
  useAuthStore.setState({
    token: 'fake-token',
    user: { sub: 'u-1', email: 'user@aponta.com', role },
  });
}

describe('KnowledgePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiGet();
    useAuthStore.setState({ token: null, user: null });
  });

  it('lists articles returned by the API', async () => {
    loginAs('CLIENT');
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Como abrir um chamado')).toBeInTheDocument();
    });
  });

  it('does not show the new-article form to a CLIENT', async () => {
    loginAs('CLIENT');
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Como abrir um chamado')).toBeInTheDocument();
    });

    expect(
      screen.queryByRole('button', { name: /novo artigo/i }),
    ).not.toBeInTheDocument();
  });

  it('shows the new-article form to an AGENT and creates an article', async () => {
    loginAs('AGENT');
    vi.mocked(api.post).mockResolvedValue({
      data: { id: 'article-2', title: 'Novo artigo interno' },
    });
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Como abrir um chamado')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /novo artigo/i }));
    await user.type(screen.getByLabelText(/título/i), 'Novo artigo interno');
    await user.type(screen.getByLabelText(/conteúdo/i), 'Conteúdo do artigo');
    await user.click(screen.getByRole('button', { name: /salvar/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/articles', {
        title: 'Novo artigo interno',
        content: 'Conteúdo do artigo',
        isPublic: true,
      });
    });
  });

  it('shows the new-article form to ADMIN as well', async () => {
    loginAs('ADMIN');
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Como abrir um chamado')).toBeInTheDocument();
    });

    expect(
      screen.getByRole('button', { name: /novo artigo/i }),
    ).toBeInTheDocument();
  });
});
