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
  amount: number;
};

const columns: ColumnDef<Ticket>[] = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'title', header: 'Título' },
  { accessorKey: 'priority', header: 'Prioridade' },
];

const data: Ticket[] = [
  { id: '1', title: 'Impressora não liga', priority: 'Alta', createdAt: '2024-01-01', amount: 100 },
  { id: '2', title: 'Erro ao salvar chamado', priority: 'Baixa', createdAt: '2024-01-02', amount: 250.5 },
  { id: '3', title: 'Acesso ao sistema negado', priority: 'Média', createdAt: '2024-01-03', amount: 49.5 },
];

const columnsWithAmount: ColumnDef<Ticket>[] = [
  ...columns,
  { accessorKey: 'amount', header: 'Valor' },
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

  it('renders a footer row with the sum of numeric columns when footerAggregations is provided', () => {
    render(
      <EzEntityGrid
        columns={columnsWithAmount}
        data={data}
        footerAggregations={{ amount: 'sum' }}
      />
    );

    const footerRow = screen.getByTestId('ez-entity-grid-footer-row');
    // 100 + 250.5 + 49.5 = 400
    expect(within(footerRow).getByText('400,00')).toBeInTheDocument();
  });

  it('does not render a footer row when footerAggregations is not provided', () => {
    render(<EzEntityGrid columns={columnsWithAmount} data={data} />);

    expect(screen.queryByTestId('ez-entity-grid-footer-row')).not.toBeInTheDocument();
  });

  it('keeps the footer row empty for a column id that does not exist in the data', () => {
    render(
      <EzEntityGrid
        columns={columnsWithAmount}
        data={data}
        footerAggregations={{ nonExistentColumn: 'sum' }}
      />
    );

    const footerRow = screen.getByTestId('ez-entity-grid-footer-row');
    const cells = within(footerRow).getAllByRole('cell');
    expect(cells.every((cell) => cell.textContent === '')).toBe(true);
  });

  it('sums the full dataset (not just the current page) when footerAggregations and pageSize are both set', () => {
    render(
      <EzEntityGrid
        columns={columnsWithAmount}
        data={data}
        pageSize={2}
        footerAggregations={{ amount: 'sum' }}
      />
    );

    const footerRow = screen.getByTestId('ez-entity-grid-footer-row');
    // 100 + 250.5 + 49.5 = 400, even though only 2 of the 3 rows are visible on this page
    expect(within(footerRow).getByText('400,00')).toBeInTheDocument();
  });

  it('renders a left-pinned column before the other columns, marked with data-pinned="left"', () => {
    render(
      <EzEntityGrid
        columns={columnsWithAmount}
        data={data}
        pinnedColumns={{ left: ['priority'] }}
      />
    );

    const headerCells = screen.getAllByRole('columnheader');
    expect(headerCells[0]).toHaveTextContent('Prioridade');
    expect(headerCells[0]).toHaveAttribute('data-pinned', 'left');
    expect(headerCells[1]).not.toHaveAttribute('data-pinned');

    const firstBodyRow = screen.getAllByRole('row')[1];
    const bodyCells = within(firstBodyRow).getAllByRole('cell');
    expect(bodyCells[0]).toHaveTextContent('Alta');
    expect(bodyCells[0]).toHaveAttribute('data-pinned', 'left');
  });

  it('renders a right-pinned column after the other columns, marked with data-pinned="right"', () => {
    render(
      <EzEntityGrid
        columns={columnsWithAmount}
        data={data}
        pinnedColumns={{ right: ['amount'] }}
      />
    );

    const headerCells = screen.getAllByRole('columnheader');
    expect(headerCells[headerCells.length - 1]).toHaveTextContent('Valor');
    expect(headerCells[headerCells.length - 1]).toHaveAttribute('data-pinned', 'right');
  });

  it('keeps the original column order when pinnedColumns is not provided', () => {
    render(<EzEntityGrid columns={columnsWithAmount} data={data} />);

    const headerCells = screen.getAllByRole('columnheader');
    expect(headerCells.map((cell) => cell.textContent)).toEqual([
      'ID',
      'Título',
      'Prioridade',
      'Valor',
    ]);
    headerCells.forEach((cell) => expect(cell).not.toHaveAttribute('data-pinned'));
  });

  it('gives a 2nd left-pinned column a cumulative offset so it does not overlap the 1st', () => {
    // jsdom reports 0 for offsetWidth by default; stub it per-element so the cumulative
    // offset math has real widths to add up (same technique AG Grid relies on via measured DOM).
    const widthById: Record<string, number> = { id: 80, title: 160 };
    const originalOffsetWidth = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      'offsetWidth'
    );
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
      configurable: true,
      get() {
        const text = this.textContent ?? '';
        if (text.startsWith('ID')) return widthById.id;
        if (text.startsWith('Título')) return widthById.title;
        return 0;
      },
    });

    try {
      render(
        <EzEntityGrid
          columns={columnsWithAmount}
          data={data}
          pinnedColumns={{ left: ['id', 'title'] }}
        />
      );

      const headerCells = screen.getAllByRole('columnheader');
      // 'id' is first → offset 0; 'title' is 2nd → offset equal to 'id's measured width (80px).
      expect(headerCells[0]).toHaveStyle({ left: '0px' });
      expect(headerCells[1]).toHaveStyle({ left: '80px' });
    } finally {
      if (originalOffsetWidth) {
        Object.defineProperty(HTMLElement.prototype, 'offsetWidth', originalOffsetWidth);
      }
    }
  });

  it('ignores a pinned column id that does not exist in the data without crashing', () => {
    render(
      <EzEntityGrid
        columns={columnsWithAmount}
        data={data}
        pinnedColumns={{ left: ['doesNotExist'] }}
      />
    );

    const headerCells = screen.getAllByRole('columnheader');
    expect(headerCells.map((cell) => cell.textContent)).toEqual([
      'ID',
      'Título',
      'Prioridade',
      'Valor',
    ]);
  });
});
