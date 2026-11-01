import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../lib/api';
import { MesaCatalogEditor } from './MesaCatalogEditor';

vi.mock('../lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const items = [
  { id: 'c1', name: 'Hardware', active: true, sortOrder: 0 },
  { id: 'c2', name: 'Rede', active: false, sortOrder: 1 },
];

function renderEditor() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MesaCatalogEditor deskId="sd-1" resource="categories" itemLabel="categoria" />
    </QueryClientProvider>,
  );
}

describe('MesaCatalogEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockResolvedValue({ data: items });
    vi.mocked(api.post).mockResolvedValue({ data: {} });
    vi.mocked(api.patch).mockResolvedValue({ data: {} });
    vi.mocked(api.delete).mockResolvedValue({ data: {} });
  });

  it('lists items, marking inactive ones, and creates a new one', async () => {
    const user = userEvent.setup();
    renderEditor();

    expect(await screen.findByText('Hardware')).toBeInTheDocument();
    expect(screen.getByText(/Rede/)).toBeInTheDocument();
    expect(screen.getByText(/\(inativo\)/)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/Nova categoria/i), 'Software');
    await user.click(screen.getByRole('button', { name: /\+ categoria/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/service-desks/sd-1/categories', {
        name: 'Software',
      });
    });
  });

  it('shows the empty state when the desk has no items', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [] });
    renderEditor();

    expect(
      await screen.findByText(/Nenhuma categoria cadastrada nesta mesa/i),
    ).toBeInTheDocument();
  });

  it('renames an item', async () => {
    const user = userEvent.setup();
    renderEditor();
    await screen.findByText('Hardware');

    await user.click(screen.getAllByRole('button', { name: 'Editar' })[0]);
    const nameInput = screen.getByLabelText('Nome');
    await user.clear(nameInput);
    await user.type(nameInput, 'Hardware e Rede');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/service-desks/sd-1/categories/c1', {
        name: 'Hardware e Rede',
      });
    });
  });

  it('toggles active/inactive', async () => {
    const user = userEvent.setup();
    renderEditor();
    await screen.findByText('Hardware');

    await user.click(screen.getAllByRole('button', { name: 'Inativar' })[0]);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/service-desks/sd-1/categories/c1', {
        active: false,
      });
    });
  });

  it('asks for confirmation and deletes an item when confirmed (DMTE-106, correção 1)', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderEditor();
    await screen.findByText('Hardware');

    await user.click(screen.getAllByRole('button', { name: 'Excluir' })[0]);

    expect(confirmSpy).toHaveBeenCalledWith(
      expect.stringContaining('Hardware'),
    );
    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/service-desks/sd-1/categories/c1');
    });
  });

  it('does not delete the item when the confirmation is declined (DMTE-106, correção 1)', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderEditor();
    await screen.findByText('Hardware');

    await user.click(screen.getAllByRole('button', { name: 'Excluir' })[0]);

    await waitFor(() => {
      expect(api.delete).not.toHaveBeenCalled();
    });
  });

  it('shows the 409 message from the API when deleting an item in use', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.mocked(api.delete).mockRejectedValue({
      response: { status: 409, data: { message: 'Em uso por 3 ticket(s); inative em vez de excluir' } },
    });
    renderEditor();
    await screen.findByText('Hardware');

    await user.click(screen.getAllByRole('button', { name: 'Excluir' })[0]);

    expect(
      await screen.findByText('Em uso por 3 ticket(s); inative em vez de excluir'),
    ).toBeInTheDocument();
  });
});
