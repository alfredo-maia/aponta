import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../lib/api';
import { TicketChecklist } from './TicketChecklist';

vi.mock('../../lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const checklistWithItems = [
  {
    id: 'cl-1',
    title: 'Pré-resolução',
    items: [
      { id: 'i1', text: 'Reiniciar serviço', isCompleted: false },
      { id: 'i2', text: 'Confirmar com cliente', isCompleted: true },
    ],
  },
];

function renderComponent(ticketId = 't1') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <TicketChecklist ticketId={ticketId} />
    </QueryClientProvider>,
  );
}

describe('TicketChecklist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the empty state with a button to create the first checklist', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [] });
    vi.mocked(api.post).mockResolvedValue({ data: {} });
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(
        screen.getByText(/nenhum protocolo ou tarefa vinculada/i),
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /criar lista interna/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/tickets/t1/checklists', {
        title: 'Pré-resolução',
      });
    });
  });

  it('renders the first checklist with its items, marking completed ones with strike-through', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: checklistWithItems });
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Reiniciar serviço')).toBeInTheDocument();
    });

    expect(screen.getByText('Confirmar com cliente')).toBeInTheDocument();
    expect(screen.getByText('Confirmar com cliente').className).toContain('line-through');
    expect(screen.getByText('Reiniciar serviço').className).not.toContain('line-through');
  });

  it('toggles an item completion via its checkbox', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: checklistWithItems });
    vi.mocked(api.patch).mockResolvedValue({ data: {} });
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Reiniciar serviço')).toBeInTheDocument();
    });

    const checkboxes = screen.getAllByRole('checkbox', { hidden: true });
    checkboxes[0].dispatchEvent(new Event('click', { bubbles: true }));
    (checkboxes[0] as HTMLInputElement).click();

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(
        '/tickets/t1/checklists/cl-1/items/i1',
        { isCompleted: true },
      );
    });
  });

  it('deletes an item when its trash button is clicked', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: checklistWithItems });
    vi.mocked(api.delete).mockResolvedValue({ data: {} });
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Reiniciar serviço')).toBeInTheDocument();
    });

    const items = screen.getAllByRole('listitem');
    const deleteButton = items[0].querySelector('button')!;
    await user.click(deleteButton);

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/tickets/t1/checklists/cl-1/items/i1');
    });
  });

  it('adds a new pending item via the inline form', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: checklistWithItems });
    vi.mocked(api.post).mockResolvedValue({ data: {} });
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Reiniciar serviço')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/adicionar tarefa pendente/i);
    await user.type(input, 'Verificar logs');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/tickets/t1/checklists/cl-1/items', {
        text: 'Verificar logs',
      });
    });
  });

  it('keeps the submit button disabled when the input is empty', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: checklistWithItems });
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Reiniciar serviço')).toBeInTheDocument();
    });

    const submitButtons = screen.getAllByRole('button');
    const addButton = submitButtons.find((b) => b.getAttribute('type') === 'submit')!;
    expect(addButton).toBeDisabled();
  });
});
