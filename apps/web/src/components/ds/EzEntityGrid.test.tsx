import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ColumnDef } from '@tanstack/react-table';
import { EzEntityGrid } from './EzEntityGrid';

type Ticket = {
  id: string;
  title: string;
  priority: string;
  createdAt: string;
};

const columns: ColumnDef<Ticket>[] = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'title', header: 'Título' },
  { accessorKey: 'priority', header: 'Prioridade' },
];

const data: Ticket[] = [
  { id: '1', title: 'Impressora não liga', priority: 'Alta', createdAt: '2024-01-01' },
  { id: '2', title: 'Erro ao salvar chamado', priority: 'Baixa', createdAt: '2024-01-02' },
  { id: '3', title: 'Acesso ao sistema negado', priority: 'Média', createdAt: '2024-01-03' },
];

describe('EzEntityGrid', () => {
  it('renders a header cell for each column and a row for each data entry', () => {
    render(<EzEntityGrid columns={columns} data={data} />);

    expect(screen.getByRole('columnheader', { name: 'ID' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Título' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Prioridade' })).toBeInTheDocument();

    expect(screen.getByText('Impressora não liga')).toBeInTheDocument();
    expect(screen.getByText('Erro ao salvar chamado')).toBeInTheDocument();
    expect(screen.getByText('Acesso ao sistema negado')).toBeInTheDocument();
  });

  it('sorts rows by column when its header is clicked', async () => {
    const user = userEvent.setup();
    render(<EzEntityGrid columns={columns} data={data} />);

    const rowsBefore = screen.getAllByRole('row').slice(1);
    expect(within(rowsBefore[0]).getByText('Impressora não liga')).toBeInTheDocument();

    await user.click(screen.getByRole('columnheader', { name: 'Título' }));

    const rowsAfterAsc = screen.getAllByRole('row').slice(1);
    expect(within(rowsAfterAsc[0]).getByText('Acesso ao sistema negado')).toBeInTheDocument();

    await user.click(screen.getByRole('columnheader', { name: 'Título' }));

    const rowsAfterDesc = screen.getAllByRole('row').slice(1);
    expect(within(rowsAfterDesc[0]).getByText('Impressora não liga')).toBeInTheDocument();
  });

  it('calls onSelectionChange with the selected rows when a row checkbox is clicked', async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    render(
      <EzEntityGrid
        columns={columns}
        data={data}
        selectable
        onSelectionChange={onSelectionChange}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    // index 0 is the "select all" header checkbox; row checkboxes start at 1
    await user.click(checkboxes[1]);

    expect(onSelectionChange).toHaveBeenCalledTimes(1);
    expect(onSelectionChange).toHaveBeenCalledWith([data[0]]);
  });

  it('renders taskbar buttons and fires onTaskbarAction when clicked', async () => {
    const user = userEvent.setup();
    const onTaskbarAction = vi.fn();
    render(
      <EzEntityGrid
        columns={columns}
        data={data}
        taskbarButtons={['INSERT', 'REMOVE']}
        onTaskbarAction={onTaskbarAction}
      />
    );

    const insertButton = screen.getByRole('button', { name: 'Incluir' });
    expect(insertButton).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Excluir' })).toBeInTheDocument();

    await user.click(insertButton);
    expect(onTaskbarAction).toHaveBeenCalledTimes(1);
    expect(onTaskbarAction).toHaveBeenCalledWith('INSERT');
  });

  it('paginates rows and advances to the next page on click', async () => {
    const user = userEvent.setup();
    render(<EzEntityGrid columns={columns} data={data} pageSize={2} />);

    expect(screen.getByText('Impressora não liga')).toBeInTheDocument();
    expect(screen.getByText('Erro ao salvar chamado')).toBeInTheDocument();
    expect(screen.queryByText('Acesso ao sistema negado')).not.toBeInTheDocument();
    expect(screen.getByText(/1.*2|p.*gina 1 de 2/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /próxima página/i }));

    expect(screen.queryByText('Impressora não liga')).not.toBeInTheDocument();
    expect(screen.getByText('Acesso ao sistema negado')).toBeInTheDocument();
  });

  it('renders the EzFilterBar above the grid when filters is provided', () => {
    const filters = [
      { id: 'status', label: 'Status', category: 'Chamado', value: 'Aberto', active: true },
    ];
    render(
      <EzEntityGrid
        columns={columns}
        data={data}
        filters={filters}
        onFilterChange={() => undefined}
        onApplyAll={() => undefined}
      />
    );

    expect(screen.getByText('Status: Aberto')).toBeInTheDocument();
  });
});
