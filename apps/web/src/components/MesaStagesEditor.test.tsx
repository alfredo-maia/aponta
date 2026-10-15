import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../lib/api';
import { MesaStagesEditor } from './MesaStagesEditor';

vi.mock('../lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const stages = [
  {
    id: 's1',
    name: 'Pendente',
    position: 0,
    isInitial: true,
    isFinal: false,
    transitionToIds: ['s2'],
  },
  {
    id: 's2',
    name: 'Fechado',
    position: 1,
    isInitial: false,
    isFinal: true,
    transitionToIds: [],
  },
];

function renderEditor() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MesaStagesEditor deskId="sd-1" />
    </QueryClientProvider>,
  );
}

describe('MesaStagesEditor', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockResolvedValue({ data: stages });
    vi.mocked(api.post).mockResolvedValue({ data: {} });
    vi.mocked(api.patch).mockResolvedValue({ data: {} });
  });

  it('lists stages and creates a new one', async () => {
    const user = userEvent.setup();
    renderEditor();

    expect(await screen.findByText(/Pendente \(inicial\)/)).toBeInTheDocument();
    expect(screen.getByText(/Fechado \(final\)/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Excluir' })).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Novo estágio'), 'N1');
    await user.click(screen.getByRole('button', { name: '+ Estágio' }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/service-desks/sd-1/stages', {
        name: 'N1',
      });
    });
  });

  it('edits name and allowed transitions', async () => {
    const user = userEvent.setup();
    renderEditor();
    await screen.findByText(/Pendente \(inicial\)/);

    await user.click(screen.getAllByRole('button', { name: 'Editar' })[0]);
    const nameInput = screen.getByLabelText('Nome');
    await user.clear(nameInput);
    await user.type(nameInput, 'Aguardando');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(
        '/service-desks/sd-1/stages/s1',
        expect.objectContaining({
          name: 'Aguardando',
          transitionToIds: ['s2'],
        }),
      );
    });
  });
});
