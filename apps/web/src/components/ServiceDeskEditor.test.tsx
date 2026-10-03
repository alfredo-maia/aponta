import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../lib/api';
import { ServiceDeskEditor } from './ServiceDeskEditor';

vi.mock('../lib/api', () => ({
  api: {
    patch: vi.fn(),
  },
}));

const agents = [
  { id: 'a-1', name: 'Alice', email: 'alice@aponta.com' },
  { id: 'a-2', name: 'Bob', email: 'bob@aponta.com' },
];

function renderEditor(desk: any, agentList: any[] = agents) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ServiceDeskEditor desk={desk} agents={agentList} />
    </QueryClientProvider>,
  );
}

describe('ServiceDeskEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the read-only summary with the agent count by default', () => {
    renderEditor({ id: 'sd-1', agents: [{ id: 'a-1' }] });

    expect(screen.getByText('Atendentes na fila:')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /editar membros/i })).toBeInTheDocument();
  });

  it('shows 0 agents when the desk has none assigned', () => {
    renderEditor({ id: 'sd-1', agents: [] });

    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('enters edit mode and lists every agent with checkboxes pre-checked for assigned ones', async () => {
    const user = userEvent.setup();
    renderEditor({ id: 'sd-1', agents: [{ id: 'a-1' }] });

    await user.click(screen.getByRole('button', { name: /editar membros/i }));

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();

    const checkboxes = screen.getAllByRole('checkbox');
    expect((checkboxes[0] as HTMLInputElement).checked).toBe(true);
    expect((checkboxes[1] as HTMLInputElement).checked).toBe(false);
  });

  it('shows an empty-agents message when the system has no agents at all', async () => {
    const user = userEvent.setup();
    renderEditor({ id: 'sd-1', agents: [] }, []);

    await user.click(screen.getByRole('button', { name: /editar membros/i }));

    expect(screen.getByText(/nenhum agente cadastrado no sistema/i)).toBeInTheDocument();
  });

  it('toggles an agent checkbox and cancels without saving', async () => {
    const user = userEvent.setup();
    renderEditor({ id: 'sd-1', agents: [{ id: 'a-1' }] });

    await user.click(screen.getByRole('button', { name: /editar membros/i }));
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[1]); // check Bob too

    await user.click(screen.getByRole('button', { name: /cancelar/i }));

    // back to read-only mode, no API call was made
    expect(screen.getByRole('button', { name: /editar membros/i })).toBeInTheDocument();
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('saves the selected agent ids via PATCH and returns to read-only mode', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: {} });
    const user = userEvent.setup();
    renderEditor({ id: 'sd-1', agents: [{ id: 'a-1' }] });

    await user.click(screen.getByRole('button', { name: /editar membros/i }));
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[1]); // also select Bob

    await user.click(screen.getByRole('button', { name: /salvar membros/i }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/service-desks/sd-1', {
        agentIds: ['a-1', 'a-2'],
      });
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /editar membros/i })).toBeInTheDocument();
    });
  });

  it('unchecking an already-assigned agent removes it from the saved list', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: {} });
    const user = userEvent.setup();
    renderEditor({ id: 'sd-1', agents: [{ id: 'a-1' }] });

    await user.click(screen.getByRole('button', { name: /editar membros/i }));
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[0]); // uncheck Alice

    await user.click(screen.getByRole('button', { name: /salvar membros/i }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/service-desks/sd-1', { agentIds: [] });
    });
  });
});
