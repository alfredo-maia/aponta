import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EzAdvancedSearch, type SearchResultItem } from './EzAdvancedSearch';

const buildItems = (): SearchResultItem[] => [
  { id: 1, title: 'Organização Social Tecnologia', subtitle: 'Cliente ativo' },
  { id: 2, title: 'Organização Acme Corp', subtitle: 'Cliente inativo' },
];

describe('EzAdvancedSearch', () => {
  it('calls searchLoader with the typed text', async () => {
    const searchLoader = vi.fn().mockResolvedValue(buildItems());
    render(<EzAdvancedSearch searchLoader={searchLoader} onSelect={() => undefined} />);

    const input = screen.getByPlaceholderText('Buscar...');
    fireEvent.change(input, { target: { value: 'social' } });

    await waitFor(() => {
      expect(searchLoader).toHaveBeenCalledWith('social');
    });
  });

  it('renders the results returned by searchLoader', async () => {
    const searchLoader = vi.fn().mockResolvedValue(buildItems());
    render(<EzAdvancedSearch searchLoader={searchLoader} onSelect={() => undefined} />);

    fireEvent.change(screen.getByPlaceholderText('Buscar...'), { target: { value: 'org' } });

    expect(await screen.findByText('Organização Social Tecnologia')).toBeInTheDocument();
    expect(screen.getByText('Organização Acme Corp')).toBeInTheDocument();
  });

  it('calls onSelect with the correct item when a result is clicked', async () => {
    const items = buildItems();
    const searchLoader = vi.fn().mockResolvedValue(items);
    const onSelect = vi.fn();
    render(<EzAdvancedSearch searchLoader={searchLoader} onSelect={onSelect} />);

    fireEvent.change(screen.getByPlaceholderText('Buscar...'), { target: { value: 'org' } });

    const result = await screen.findByText('Organização Acme Corp');
    fireEvent.click(result);

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(items[1]);
  });

  it('shows a loading state while searchLoader is pending', async () => {
    let resolvePromise: (items: SearchResultItem[]) => void = () => undefined;
    const searchLoader = vi.fn().mockImplementation(
      () =>
        new Promise<SearchResultItem[]>((resolve) => {
          resolvePromise = resolve;
        })
    );
    render(<EzAdvancedSearch searchLoader={searchLoader} onSelect={() => undefined} />);

    fireEvent.change(screen.getByPlaceholderText('Buscar...'), { target: { value: 'org' } });

    expect(await screen.findByRole('status')).toBeInTheDocument();

    resolvePromise(buildItems());

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Organização Social Tecnologia')).toBeInTheDocument();
  });

  it('shows an empty state when searchLoader resolves with no results', async () => {
    const searchLoader = vi.fn().mockResolvedValue([]);
    render(<EzAdvancedSearch searchLoader={searchLoader} onSelect={() => undefined} />);

    fireEvent.change(screen.getByPlaceholderText('Buscar...'), { target: { value: 'xyz' } });

    expect(await screen.findByText('Nenhum resultado encontrado')).toBeInTheDocument();
  });

  it('switches to grid view mode when viewMode is "grid"', async () => {
    const searchLoader = vi.fn().mockResolvedValue(buildItems());
    render(<EzAdvancedSearch searchLoader={searchLoader} onSelect={() => undefined} viewMode="grid" />);

    fireEvent.change(screen.getByPlaceholderText('Buscar...'), { target: { value: 'org' } });

    expect(await screen.findByText('Organização Social Tecnologia')).toBeInTheDocument();
    expect(screen.getByTestId('ez-advanced-search-results')).toHaveAttribute('data-view-mode', 'grid');
  });

  it('toggles between list and grid view using the view mode buttons', async () => {
    const searchLoader = vi.fn().mockResolvedValue(buildItems());
    render(<EzAdvancedSearch searchLoader={searchLoader} onSelect={() => undefined} />);

    fireEvent.change(screen.getByPlaceholderText('Buscar...'), { target: { value: 'org' } });
    await screen.findByText('Organização Social Tecnologia');

    fireEvent.click(screen.getByLabelText('Exibir em grade'));
    expect(screen.getByTestId('ez-advanced-search-results')).toHaveAttribute('data-view-mode', 'grid');

    fireEvent.click(screen.getByLabelText('Exibir em lista'));
    expect(screen.getByTestId('ez-advanced-search-results')).toHaveAttribute('data-view-mode', 'list');
  });

  it('renders a tree toggle and uses treeLoader when provided and active', async () => {
    const searchLoader = vi.fn().mockResolvedValue(buildItems());
    const treeLoader = vi.fn().mockResolvedValue([
      { id: 10, label: 'Raiz', children: [{ id: 11, label: 'Filho' }] },
    ]);
    render(
      <EzAdvancedSearch searchLoader={searchLoader} onSelect={() => undefined} treeLoader={treeLoader} />
    );

    fireEvent.click(screen.getByLabelText('Exibir em árvore'));
    fireEvent.change(screen.getByPlaceholderText('Buscar...'), { target: { value: 'raiz' } });

    await waitFor(() => {
      expect(treeLoader).toHaveBeenCalledWith('raiz');
    });
    expect(await screen.findByText('Raiz')).toBeInTheDocument();
  });

  it('forwards the ref to the root element', () => {
    const ref = vi.fn();
    const searchLoader = vi.fn().mockResolvedValue([]);
    render(<EzAdvancedSearch ref={ref} searchLoader={searchLoader} onSelect={() => undefined} />);
    expect(ref).toHaveBeenCalled();
  });
});
