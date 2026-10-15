import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { api } from '../lib/api';
import { MesaFlagEditor } from './MesaFlagEditor';

vi.mock('../lib/api', () => ({
  api: { patch: vi.fn() },
}));

describe('MesaFlagEditor', () => {
  it('patches the selected flags for a mesa', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: {} });
    const user = userEvent.setup();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MesaFlagEditor
          deskId="sd-1"
          flags={[
            { key: 'catalogRequiredOnOpen', label: 'Catálogo obrigatório ao abrir' },
          ]}
          values={{ catalogRequiredOnOpen: false }}
        />
      </QueryClientProvider>,
    );

    await user.click(screen.getByLabelText('Catálogo obrigatório ao abrir'));
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/service-desks/sd-1', {
        catalogRequiredOnOpen: true,
      });
    });
  });

  it('shows an error when saving flags fails', async () => {
    vi.mocked(api.patch).mockRejectedValue(new Error('fail'));
    const user = userEvent.setup();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MesaFlagEditor
          deskId="sd-1"
          flags={[{ key: 'catalogRequiredOnOpen', label: 'Catálogo obrigatório ao abrir' }]}
          values={{ catalogRequiredOnOpen: true }}
        />
      </QueryClientProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível salvar as opções da mesa.',
    );
  });
});
