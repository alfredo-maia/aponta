import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, beforeEach, expect, it, vi } from 'vitest';
import { api } from '../../lib/api';
import { KnowledgeFoldersGrid } from './KnowledgeFoldersGrid';

vi.mock('../../lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const folders = [
  { id: 'folder-1', name: 'Financeiro', description: 'Notas fiscais', icon: '💰', _count: { articles: 3 } },
  { id: 'folder-2', name: 'TI', description: null, icon: '💻', _count: { articles: 0 } },
];

function mockApiGet() {
  vi.mocked(api.get).mockImplementation((url: string) => {
    if (url.startsWith('/knowledge-folders')) {
      return Promise.resolve({ data: folders });
    }
    return Promise.reject(new Error(`Unexpected GET ${url}`));
  });
}

function renderGrid(props: Partial<React.ComponentProps<typeof KnowledgeFoldersGrid>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <KnowledgeFoldersGrid onOpenFolder={vi.fn()} canAuthor={false} {...props} />
    </QueryClientProvider>,
  );
}

describe('KnowledgeFoldersGrid', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiGet();
    window.confirm = vi.fn(() => true);
  });

  it('renders folders fetched from the API with their article count', async () => {
    renderGrid();

    await waitFor(() => {
      expect(screen.getByText('Financeiro')).toBeInTheDocument();
    });

    expect(screen.getByText('TI')).toBeInTheDocument();
    expect(screen.getByText('3 artigos')).toBeInTheDocument();
    expect(screen.getByText('0 artigos')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/knowledge-folders');
  });

  it('calls onOpenFolder when a folder card is clicked', async () => {
    const onOpenFolder = vi.fn();
    const user = userEvent.setup();
    renderGrid({ onOpenFolder });

    await waitFor(() => {
      expect(screen.getByText('Financeiro')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Financeiro'));

    expect(onOpenFolder).toHaveBeenCalledWith('folder-1');
  });

  it('does not show the "+ Nova pasta" button when the user cannot author', async () => {
    renderGrid({ canAuthor: false });

    await waitFor(() => {
      expect(screen.getByText('Financeiro')).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /\+ nova pasta/i })).not.toBeInTheDocument();
  });

  it('allows a canAuthor user to create a new folder', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { id: 'folder-3' } });
    const user = userEvent.setup();
    renderGrid({ canAuthor: true });

    await waitFor(() => {
      expect(screen.getByText('Financeiro')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /\+ nova pasta/i }));
    await user.type(screen.getByLabelText(/nome/i), 'RH');
    await user.type(screen.getByLabelText(/descrição/i), 'Assuntos de RH');
    await user.type(screen.getByLabelText(/ícone/i), '🧑');

    await user.click(screen.getByRole('button', { name: /salvar/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/knowledge-folders', {
        name: 'RH',
        description: 'Assuntos de RH',
        icon: '🧑',
      });
    });
  });

  it('allows a canAuthor user to delete a folder after confirming', async () => {
    vi.mocked(api.delete).mockResolvedValue({ data: {} });
    const user = userEvent.setup();
    renderGrid({ canAuthor: true });

    await waitFor(() => {
      expect(screen.getByText('Financeiro')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button', { name: /excluir/i });
    await user.click(deleteButtons[0]);

    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/knowledge-folders/folder-1');
    });
  });

  it('shows an empty state when there are no folders', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [] });
    renderGrid();

    await waitFor(() => {
      expect(screen.getByText(/nenhuma pasta/i)).toBeInTheDocument();
    });
  });
});
