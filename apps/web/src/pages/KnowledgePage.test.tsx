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

const folders = [
  { id: 'folder-1', name: 'Suporte', description: 'Artigos de suporte', icon: '🛟', _count: { articles: 2 } },
];

const articles = [
  {
    id: 'article-1',
    title: 'Como abrir um chamado',
    content: 'Clique em Novo Chamado...',
    isPublic: true,
    tags: ['senha', 'ajuda'],
    author: { id: 'u-1', name: 'Fulano' },
    updatedAt: '2026-01-10T10:00:00.000Z',
  },
  {
    id: 'article-2',
    title: 'Artigo interno',
    content: 'Segredo de suporte',
    isPublic: false,
    tags: ['interno'],
    author: { id: 'u-2', name: 'Ciclana' },
    updatedAt: '2026-02-20T10:00:00.000Z',
  }
];

function mockApiGet() {
  vi.mocked(api.get).mockImplementation((url: string) => {
    if (url.startsWith('/knowledge-folders')) {
      return Promise.resolve({ data: folders });
    }
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

/** Navigates past the folders grid into the article list of "Suporte". */
async function openSupportFolder(user: ReturnType<typeof userEvent.setup>) {
  await waitFor(() => {
    expect(screen.getByText('Suporte')).toBeInTheDocument();
  });
  await user.click(screen.getByText('Suporte'));
  await waitFor(() => {
    expect(screen.getByText('Como abrir um chamado')).toBeInTheDocument();
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

  it('shows the folders grid first, not the article list', async () => {
    loginAs('anonymous');
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Suporte')).toBeInTheDocument();
    });

    expect(screen.queryByText('Como abrir um chamado')).not.toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/knowledge-folders');
  });

  it('opens a folder and lists only its articles, filtered by folderId', async () => {
    loginAs('anonymous');
    const user = userEvent.setup();
    renderPage();

    await openSupportFolder(user);

    expect(api.get).toHaveBeenCalledWith('/articles?folderId=folder-1');
  });

  it('shows a breadcrumb back to the folders grid once inside a folder', async () => {
    loginAs('anonymous');
    const user = userEvent.setup();
    renderPage();

    await openSupportFolder(user);

    expect(screen.getByText('Pastas')).toBeInTheDocument();
    expect(screen.getByText('Suporte')).toBeInTheDocument();

    await user.click(screen.getByText('Pastas'));

    await waitFor(() => {
      expect(screen.queryByText('Como abrir um chamado')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Suporte')).toBeInTheDocument();
  });

  it('does not show the new-article form or edit/delete buttons to a CLIENT', async () => {
    loginAs('CLIENT');
    const user = userEvent.setup();
    renderPage();

    await openSupportFolder(user);

    expect(screen.queryByRole('button', { name: /\+ novo artigo/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /editar/i })).not.toBeInTheDocument();
  });

  it('shows the new-article form to an AGENT and creates an article inside the open folder', async () => {
    loginAs('AGENT');
    vi.mocked(api.post).mockResolvedValue({
      data: { id: 'article-3', title: 'Novo artigo' },
    });
    const user = userEvent.setup();
    renderPage();

    await openSupportFolder(user);

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
        folderId: 'folder-1',
      });
    });
  });

  it('allows an AGENT to update an existing article', async () => {
    loginAs('AGENT');
    vi.mocked(api.patch).mockResolvedValue({ data: {} });
    const user = userEvent.setup();
    renderPage();

    await openSupportFolder(user);

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

  it('allows filtering by search keyword and tag inside a folder', async () => {
    loginAs('CLIENT');
    const user = userEvent.setup();
    renderPage();

    await openSupportFolder(user);

    // type in search bar
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'senha' } });

    await waitFor(() => {
      const calls = vi.mocked(api.get).mock.calls;
      expect(calls.some(call => call[0] === '/articles?search=senha&folderId=folder-1')).toBe(true);
    });

    await waitFor(() => {
      expect(screen.getByTitle('Filtrar por senha')).toBeInTheDocument();
    });

    const tagButton = screen.getByTitle('Filtrar por senha');
    await user.click(tagButton);

    await waitFor(() => {
      const calls = vi.mocked(api.get).mock.calls;
      expect(calls.some(call => call[0] === '/articles?search=senha&tags=senha&folderId=folder-1')).toBe(true);
    });
  });

  it('allows selecting more than one tag at once (OR filter)', async () => {
    loginAs('CLIENT');
    const user = userEvent.setup();
    renderPage();

    await openSupportFolder(user);

    await user.click(screen.getByTitle('Filtrar por senha'));
    await user.click(screen.getByTitle('Filtrar por ajuda'));

    await waitFor(() => {
      const calls = vi.mocked(api.get).mock.calls;
      expect(calls.some(call => call[0] === '/articles?tags=senha%2Cajuda&folderId=folder-1')).toBe(true);
    });

    // removing one of the active tag chips drops it from the filter
    await user.click(screen.getByLabelText('Remover filtro de tag senha'));

    await waitFor(() => {
      const calls = vi.mocked(api.get).mock.calls;
      expect(calls.some(call => call[0] === '/articles?tags=ajuda&folderId=folder-1')).toBe(true);
    });
  });

  it('shows the author and last-updated date on each article', async () => {
    loginAs('anonymous');
    const user = userEvent.setup();
    renderPage();

    await openSupportFolder(user);

    expect(screen.getByText(/Por Fulano/)).toBeInTheDocument();
    expect(screen.getByText(/Por Ciclana/)).toBeInTheDocument();
  });

  it('sends the chosen sort order to the API', async () => {
    loginAs('anonymous');
    const user = userEvent.setup();
    renderPage();

    await openSupportFolder(user);

    fireEvent.change(screen.getByLabelText('Ordenar por'), { target: { value: 'title_asc' } });

    await waitFor(() => {
      const calls = vi.mocked(api.get).mock.calls;
      expect(calls.some(call => call[0] === '/articles?sort=title_asc&folderId=folder-1')).toBe(true);
    });
  });

  it('toggles between list and grid view modes', async () => {
    loginAs('anonymous');
    const user = userEvent.setup();
    renderPage();

    await openSupportFolder(user);

    expect(screen.getByTestId('knowledge-articles')).toHaveAttribute('data-view-mode', 'list');

    await user.click(screen.getByLabelText('Exibir em grade'));
    expect(screen.getByTestId('knowledge-articles')).toHaveAttribute('data-view-mode', 'grid');

    await user.click(screen.getByLabelText('Exibir em lista'));
    expect(screen.getByTestId('knowledge-articles')).toHaveAttribute('data-view-mode', 'list');
  });

  it('paginates articles beyond the first page', async () => {
    const manyArticles = Array.from({ length: 12 }, (_, i) => ({
      id: `extra-${i}`,
      title: `Artigo ${i}`,
      content: 'Conteúdo',
      isPublic: true,
      tags: [],
      author: { id: 'u-1', name: 'Fulano' },
      updatedAt: '2026-01-01T00:00:00.000Z',
    }));
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.startsWith('/knowledge-folders')) {
        return Promise.resolve({ data: folders });
      }
      if (url.startsWith('/articles')) {
        return Promise.resolve({ data: manyArticles });
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });
    loginAs('anonymous');
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Suporte')).toBeInTheDocument();
    });
    await user.click(screen.getByText('Suporte'));

    await waitFor(() => {
      expect(screen.getByText('Artigo 0')).toBeInTheDocument();
    });

    expect(screen.queryByText('Artigo 11')).not.toBeInTheDocument();
    expect(screen.getByText('Página 1 de 2')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /próxima/i }));

    expect(screen.getByText('Artigo 11')).toBeInTheDocument();
    expect(screen.queryByText('Artigo 0')).not.toBeInTheDocument();
  });

  it('allows deleting an article', async () => {
    loginAs('ADMIN');
    vi.mocked(api.delete).mockResolvedValue({ data: {} });
    const user = userEvent.setup();
    renderPage();

    await openSupportFolder(user);

    const deleteBtns = screen.getAllByRole('button', { name: /excluir/i });
    await user.click(deleteBtns[0]);

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/articles/article-1');
    });
  });
});
