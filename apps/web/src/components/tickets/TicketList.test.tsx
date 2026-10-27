import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../../stores/authStore';
import type { Ticket } from '../../hooks/useTickets';
import { TicketList } from './TicketList';

const ticketA: Ticket = {
  id: 't1',
  protocol: 'AP-2026-0001',
  title: 'Printer broken',
  description: 'desc',
  status: 'OPEN',
  priority: 'HIGH',
  requesterId: 'r1',
  requester: {
    id: 'r1',
    name: 'Maria Souza',
    email: 'maria@acme.com',
    organizationId: 'org-1',
    organization: { id: 'org-1', name: 'Acme' },
  },
  agentId: 'agent-1',
  agent: { id: 'agent-1', name: 'Agente Silva' },
  serviceDeskId: 'desk-1',
  serviceDesk: { id: 'desk-1', name: 'Suporte N1' },
  stageId: 'stage-1',
  stage: { id: 'stage-1', name: 'Triagem', isInitial: true, isFinal: false },
  responseDeadline: '2026-01-01T10:00:00.000Z',
  resolveDeadline: '2026-01-02T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const ticketB: Ticket = {
  ...ticketA,
  id: 't2',
  protocol: 'AP-2026-0002',
  title: 'Email down',
  status: 'IN_PROGRESS',
  priority: 'MEDIUM',
  requester: {
    id: 'r2',
    name: 'João Pereira',
    email: 'joao@beta.com',
    organizationId: 'org-2',
    organization: { id: 'org-2', name: 'Beta' },
  },
};

function renderList(props: Partial<Parameters<typeof TicketList>[0]> = {}) {
  const defaults: Parameters<typeof TicketList>[0] = {
    tickets: [ticketA, ticketB],
    isLoading: false,
    isError: false,
  };
  return render(
    <MemoryRouter>
      <TicketList {...defaults} {...props} />
    </MemoryRouter>,
  );
}

describe('TicketList (D5: Lista agrupável)', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({
      token: null,
      user: { sub: 'u1', email: 'a@x.com', role: 'ADMIN', organizationId: null } as any,
    });
  });

  it('shows a loading indicator when isLoading is true', () => {
    renderList({ tickets: [], isLoading: true });
    expect(screen.getByRole('status')).toHaveTextContent(/carregando chamados/i);
  });

  it('shows an error message when isError is true', () => {
    renderList({ tickets: [], isError: true });
    expect(screen.getByRole('alert')).toHaveTextContent(/falha ao carregar os chamados/i);
  });

  it('shows an empty-state message when there are no tickets', () => {
    renderList({ tickets: [] });
    expect(screen.getByText(/nenhum chamado encontrado/i)).toBeInTheDocument();
  });

  it('renders the default columns: Número, Título, Cliente, Origem, Prioridade, Status, Estágio (AC6)', () => {
    renderList();
    const headerRow = screen.getAllByRole('columnheader');
    const headerLabels = headerRow.map((h) => h.textContent);
    for (const label of ['Número', 'Título', 'Cliente', 'Origem', 'Prioridade', 'Status', 'Estágio']) {
      expect(headerLabels.some((h) => h?.includes(label))).toBe(true);
    }
    // Optional columns start hidden
    expect(headerLabels.some((h) => h?.includes('Responsável'))).toBe(false);
  });

  it('renders a row per ticket with its data, ungrouped by default', () => {
    renderList();
    expect(screen.getByText('AP-2026-0001')).toBeInTheDocument();
    expect(screen.getByText('Printer broken')).toBeInTheDocument();
    expect(screen.getByText('Acme')).toBeInTheDocument();
  });

  it('groups by the chosen field, with a collapsible group row showing a count (AC6)', async () => {
    const user = userEvent.setup();
    renderList();

    await user.selectOptions(screen.getByLabelText(/agrupar por/i), 'organization');

    const acmeGroup = screen.getByText(/Acme.*\(1\)|Acme — 1|Acme \(1\)/i);
    expect(acmeGroup).toBeInTheDocument();
    // Collapsed by default: rows hidden until the group is expanded
    expect(screen.queryByText('AP-2026-0001')).not.toBeInTheDocument();

    await user.click(acmeGroup);
    expect(await screen.findByText('AP-2026-0001')).toBeInTheDocument();
    expect(screen.queryByText('AP-2026-0002')).not.toBeInTheDocument();
  });

  it('"Nenhum" removes grouping and shows every row flat', async () => {
    const user = userEvent.setup();
    renderList();

    await user.selectOptions(screen.getByLabelText(/agrupar por/i), 'organization');
    await user.selectOptions(screen.getByLabelText(/agrupar por/i), 'none');

    expect(screen.getByText('AP-2026-0001')).toBeInTheDocument();
    expect(screen.getByText('AP-2026-0002')).toBeInTheDocument();
  });

  it('toggles an optional column on via "Exibir colunas" and it persists after remount (D5 persistence)', async () => {
    const user = userEvent.setup();
    const { unmount } = renderList();

    await user.click(screen.getByRole('button', { name: /exibir colunas/i }));
    await user.click(screen.getByRole('checkbox', { name: /responsável/i }));

    expect(screen.getAllByRole('columnheader').some((h) => h.textContent?.includes('Responsável'))).toBe(
      true,
    );

    unmount();
    renderList();
    expect(screen.getAllByRole('columnheader').some((h) => h.textContent?.includes('Responsável'))).toBe(
      true,
    );
  });

  it('shows the R1 warning when grouping with more than one page of results', async () => {
    const user = userEvent.setup();
    renderList({ totalPages: 3 });

    await user.selectOptions(screen.getByLabelText(/agrupar por/i), 'organization');

    expect(screen.getByText(/agrupando os 2 chamados desta página/i)).toBeInTheDocument();
  });

  it('clicking a sortable column header calls onSortChange, toggling direction on repeated clicks', async () => {
    const onSortChange = vi.fn();
    const user = userEvent.setup();
    renderList({ onSortChange });

    await user.click(screen.getByRole('button', { name: 'Título' }));
    expect(onSortChange).toHaveBeenCalledWith('title', 'asc');

    await user.click(screen.getByRole('button', { name: 'Título' }));
    expect(onSortChange).toHaveBeenCalledWith('title', 'desc');
  });
});
