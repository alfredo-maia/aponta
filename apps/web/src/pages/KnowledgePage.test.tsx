import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const articles = [
  {
    id: 'article-1',
    title: 'Como abrir um chamado',
    content: 'Clique em Novo Chamado...',
    isPublic: true,
    tags: ['senha', 'ajuda'],
  },
  {
    id: 'article-2',
    title: 'Artigo interno',
    content: 'Segredo de suporte',
    isPublic: false,
    tags: ['interno'],
  }
];

function mockApiGet() {
  vi.mocked(api.get).mockImplementation((url: string) => {
    if (url.startsWith('/articles')) {
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

function loginAs(role: 'ADMIN' | 'AGENT' | 'CLIENT' | 'anonymous') {
  if (role === 'anonymous') {
    useAuthStore.setState({ token: null, user: null });
    return;
  }
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
    window.scrollTo = vi.fn();
    window.confirm = vi.fn(() => true);
  });

  it('lists articles returned by the API and allows anonymous access', async () => {
    loginAs('anonymous');
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Como abrir um chamado')).toBeInTheDocument();
    });
    // check if it sent the request without search/tag params
    expect(api.get).toHaveBeenCalledWith('/articles?');
  });

  it('does not show the new-article form or edit/delete buttons to a CLIENT', async () => {
    loginAs('CLIENT');
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Como abrir um chamado')).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /\+ novo artigo/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /editar/i })).not.toBeInTheDocument();
  });

  it('shows the new-article form to an AGENT and creates an article', async () => {
    loginAs('AGENT');
    vi.mocked(api.post).mockResolvedValue({
      data: { id: 'article-3', title: 'Novo artigo' },
    });
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Como abrir um chamado')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /\+ novo artigo/i }));
    await user.type(screen.getByLabelText(/título/i), 'Novo artigo interno');
    await user.type(screen.getByLabelText(/conteúdo/i), 'Conteúdo do artigo');
    await user.type(screen.getByLabelText(/tags/i), 'tag1, tag2');
    
    // uncheck public
    await user.click(screen.getByRole('checkbox', { name: /público/i }));

    await user.click(screen.getByRole('button', { name: /salvar/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/articles', {
        title: 'Novo artigo interno',
        content: 'Conteúdo do artigo',
        isPublic: false,
        tags: ['tag1', 'tag2'],
      });
    });
  });

  it('allows an AGENT to update an existing article', async () => {
    loginAs('AGENT');
    vi.mocked(api.patch).mockResolvedValue({ data: {} });
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Como abrir um chamado')).toBeInTheDocument();
    });

    // click raw Edit, since there are two we target the first one
    const editBtns = screen.getAllByRole('button', { name: /editar/i });
    await user.click(editBtns[0]);

    // form must be prepopulated
    expect(screen.getByLabelText(/título/i)).toHaveValue('Como abrir um chamado');
    expect(screen.getByLabelText(/tags/i)).toHaveValue('senha, ajuda');

    // edit title
    await user.clear(screen.getByLabelText(/título/i));
    await user.type(screen.getByLabelText(/título/i), 'Título modificado');

    await user.click(screen.getByRole('button', { name: /atualizar/i }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/articles/article-1', {
        title: 'Título modificado',
        content: 'Clique em Novo Chamado...',
        isPublic: true,
        tags: ['senha', 'ajuda'],
      });
    });
  });

  it('allows filtering by search keyword and tag', async () => {
    loginAs('CLIENT');
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Como abrir um chamado')).toBeInTheDocument();
    });

    // type in search bar
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'senha' } });
    
    await waitFor(() => {
      const calls = vi.mocked(api.get).mock.calls;
      expect(calls.some(call => call[0] === '/articles?search=senha')).toBe(true);
    });

    await waitFor(() => {
      expect(screen.getByTitle('Filtrar por senha')).toBeInTheDocument();
    });

    const tagButton = screen.getByTitle('Filtrar por senha');
    await user.click(tagButton);

    await waitFor(() => {
      const calls = vi.mocked(api.get).mock.calls;
      console.log('--- CALLS NOW ---', calls.map(c => c[0]));
      expect(calls.some(call => call[0] === '/articles?search=senha&tag=senha')).toBe(true);
    });
  });

  it('allows deleting an article', async () => {
    loginAs('ADMIN');
    vi.mocked(api.delete).mockResolvedValue({ data: {} });
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Como abrir um chamado')).toBeInTheDocument();
    });

    const deleteBtns = screen.getAllByRole('button', { name: /excluir/i });
    await user.click(deleteBtns[0]);

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/articles/article-1');
    });
  });
});
