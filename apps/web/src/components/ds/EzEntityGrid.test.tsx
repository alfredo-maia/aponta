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
    expect(screen.getByText(/p.*gina 1 de 2/i)).toBeInTheDocument();
    expect(screen.getByText('1-2 de 3')).toBeInTheDocument();

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

describe('EzEntityGrid grouping', () => {
  const groupableData: Ticket[] = [
    { id: '1', title: 'Impressora não liga', priority: 'Alta', createdAt: '2024-01-01', amount: 100 },
    { id: '2', title: 'Erro ao salvar chamado', priority: 'Alta', createdAt: '2024-01-02', amount: 50 },
    { id: '3', title: 'Acesso ao sistema negado', priority: 'Baixa', createdAt: '2024-01-03', amount: 30 },
  ];

  it('renders one collapsed group header row per distinct value when groupBy is set', () => {
    render(<EzEntityGrid columns={columnsWithAmount} data={groupableData} groupBy={['priority']} />);

    // Groups start collapsed: 2 group rows (Alta, Baixa), 0 leaf rows visible yet.
    const groupRows = screen.getAllByTestId('ez-entity-grid-group-row');
    expect(groupRows).toHaveLength(2);
    expect(groupRows[0]).toHaveTextContent('Alta');
    expect(groupRows[0]).toHaveTextContent('2'); // group row count badge
    expect(groupRows[1]).toHaveTextContent('Baixa');
    expect(screen.queryByText('Impressora não liga')).not.toBeInTheDocument();
  });

  it('expands a group to reveal its leaf rows when its header row is clicked', async () => {
    const user = userEvent.setup();
    render(<EzEntityGrid columns={columnsWithAmount} data={groupableData} groupBy={['priority']} />);

    const groupRows = screen.getAllByTestId('ez-entity-grid-group-row');
    await user.click(groupRows[0]);

    expect(screen.getByText('Impressora não liga')).toBeInTheDocument();
    expect(screen.getByText('Erro ao salvar chamado')).toBeInTheDocument();
    expect(screen.queryByText('Acesso ao sistema negado')).not.toBeInTheDocument();
  });

  it('does not render group rows when groupBy is omitted', () => {
    render(<EzEntityGrid columns={columnsWithAmount} data={groupableData} />);

    expect(screen.queryByTestId('ez-entity-grid-group-row')).not.toBeInTheDocument();
    expect(screen.getByText('Impressora não liga')).toBeInTheDocument();
  });

  it('ignores a groupBy column id that does not exist in the data without crashing', () => {
    render(<EzEntityGrid columns={columnsWithAmount} data={groupableData} groupBy={['doesNotExist']} />);

    expect(screen.queryByTestId('ez-entity-grid-group-row')).not.toBeInTheDocument();
    expect(screen.getByText('Impressora não liga')).toBeInTheDocument();
  });

  it('shows a fallback label instead of the literal string "undefined" when the grouping value is missing', () => {
    const dataWithMissingField: Ticket[] = [
      { id: '1', title: 'Sem prioridade definida', priority: undefined as unknown as string, createdAt: '2024-01-01', amount: 10 },
      { id: '2', title: 'Acesso ao sistema negado', priority: 'Baixa', createdAt: '2024-01-03', amount: 30 },
    ];
    render(<EzEntityGrid columns={columnsWithAmount} data={dataWithMissingField} groupBy={['priority']} />);

    const groupRows = screen.getAllByTestId('ez-entity-grid-group-row');
    expect(groupRows.some((row) => row.textContent?.includes('undefined'))).toBe(false);
    expect(groupRows.some((row) => row.textContent?.includes('Sem valor'))).toBe(true);
  });

  it('expands a group when its header row receives Enter or Space while focused', async () => {
    const user = userEvent.setup();
    render(<EzEntityGrid columns={columnsWithAmount} data={groupableData} groupBy={['priority']} />);

    const groupRows = screen.getAllByTestId('ez-entity-grid-group-row');
    expect(groupRows[0]).toHaveAttribute('tabindex', '0');
    expect(groupRows[0]).toHaveAttribute('role', 'button');

    groupRows[0].focus();
    await user.keyboard('{Enter}');

    expect(screen.getByText('Impressora não liga')).toBeInTheDocument();
    expect(screen.getByText('Erro ao salvar chamado')).toBeInTheDocument();
  });
});

describe('EzEntityGrid visual tokens (Sankhya ERP parity)', () => {
  it('applies compact row density by default (~25px line height with py-1 on cells and py-1.5 on headers)', () => {
    render(<EzEntityGrid columns={columns} data={data} />);
    const headers = screen.getAllByRole('columnheader');
    expect(headers[0]).toHaveClass('py-1.5');

    const firstBodyRow = screen.getAllByRole('row')[1];
    const firstCell = within(firstBodyRow).getAllByRole('cell')[0];
    expect(firstCell).toHaveClass('py-1');
  });

  it('applies comfortable density (py-3) when density="comfortable" is passed', () => {
    render(<EzEntityGrid columns={columns} data={data} density="comfortable" />);
    const headers = screen.getAllByRole('columnheader');
    expect(headers[0]).toHaveClass('py-3');

    const firstBodyRow = screen.getAllByRole('row')[1];
    const firstCell = within(firstBodyRow).getAllByRole('cell')[0];
    expect(firstCell).toHaveClass('py-3');
  });

  it('applies hover:bg-grid-row-hover to body rows', () => {
    render(<EzEntityGrid columns={columns} data={data} />);
    const firstBodyRow = screen.getAllByRole('row')[1];
    expect(firstBodyRow).toHaveClass('hover:bg-grid-row-hover');
  });

  it('applies bg-brand-50 to selected rows when selectable is true and row is checked', async () => {
    const user = userEvent.setup();
    render(<EzEntityGrid columns={columns} data={data} selectable />);
    const checkboxes = screen.getAllByRole('checkbox');
    const firstBodyRow = screen.getAllByRole('row')[1];
    expect(firstBodyRow).not.toHaveClass('bg-brand-50');

    await user.click(checkboxes[1]);
    expect(firstBodyRow).toHaveClass('bg-brand-50');
  });

  it('adds border-r border-gray-100 vertical grade between header columns except on the last column', () => {
    render(<EzEntityGrid columns={columns} data={data} />);
    const headers = screen.getAllByRole('columnheader');
    expect(headers.length).toBe(columns.length);
    for (let i = 0; i < headers.length - 1; i++) {
      expect(headers[i]).toHaveClass('border-r');
      expect(headers[i]).toHaveClass('border-gray-100');
    }
    expect(headers[headers.length - 1]).not.toHaveClass('border-r');
  });
});

describe('EzEntityGrid rich pagination and horizontal scrollbar (Sankhya parity)', () => {
  it('displays explicit record count "1-2 de 3" and page size selector when paginated', async () => {
    const user = userEvent.setup();
    const onPageSizeChange = vi.fn();
    render(
      <EzEntityGrid
        columns={columns}
        data={data}
        pageSize={2}
        pageSizeOptions={[2, 5, 10]}
        onPageSizeChange={onPageSizeChange}
      />
    );

    // Initial page: 1-2 de 3
    expect(screen.getByTestId('ez-entity-grid-pagination-count')).toHaveTextContent('1-2 de 3');
    const select = screen.getByLabelText('Linhas por página:');
    expect(select).toBeInTheDocument();
    expect(select).toHaveValue('2');

    // Next page: 3-3 de 3
    await user.click(screen.getByRole('button', { name: /próxima página/i }));
    expect(screen.getByTestId('ez-entity-grid-pagination-count')).toHaveTextContent('3-3 de 3');

    // Previous page: 1-2 de 3
    await user.click(screen.getByRole('button', { name: /página anterior/i }));
    expect(screen.getByTestId('ez-entity-grid-pagination-count')).toHaveTextContent('1-2 de 3');

    // Next page again: 3-3 de 3
    await user.click(screen.getByRole('button', { name: /próxima página/i }));
    expect(screen.getByTestId('ez-entity-grid-pagination-count')).toHaveTextContent('3-3 de 3');

    // Change page size to 5
    await user.selectOptions(select, '5');
    expect(onPageSizeChange).toHaveBeenCalledWith(5);
    expect(screen.getByTestId('ez-entity-grid-pagination-count')).toHaveTextContent('1-3 de 3');
    expect(screen.getByText('Impressora não liga')).toBeInTheDocument();
    expect(screen.getByText('Erro ao salvar chamado')).toBeInTheDocument();
    expect(screen.getByText('Acesso ao sistema negado')).toBeInTheDocument();
  });

  it('renders persistent horizontal scrollbar when alwaysShowHorizontalScrollbar is enabled', () => {
    render(
      <EzEntityGrid
        columns={columns}
        data={data}
        alwaysShowHorizontalScrollbar
      />
    );

    const scrollbar = screen.getByTestId('ez-grid-horizontal-scrollbar');
    expect(scrollbar).toBeInTheDocument();
    const thumb = screen.getByTestId('ez-grid-horizontal-scrollbar-thumb');
    expect(thumb).toBeInTheDocument();
    expect(thumb).toHaveAttribute('role', 'scrollbar');
    expect(thumb).toHaveAttribute('aria-orientation', 'horizontal');
  });

  it('does not render horizontal scrollbar when showHorizontalScrollbar is false', () => {
    render(
      <EzEntityGrid
        columns={columns}
        data={data}
        alwaysShowHorizontalScrollbar
        showHorizontalScrollbar={false}
      />
    );

    expect(screen.queryByTestId('ez-grid-horizontal-scrollbar')).not.toBeInTheDocument();
  });
});

describe('EzEntityGrid Excel-style column filters and status bar counters', () => {
  it('renders status bar with total row count and selection counter when selectable', async () => {
    const user = userEvent.setup();
    render(<EzEntityGrid columns={columnsWithAmount} data={data} selectable />);

    const statusBar = screen.getByTestId('ez-entity-grid-status-bar');
    expect(statusBar).toBeInTheDocument();
    expect(screen.getByTestId('ez-entity-grid-total-count')).toHaveTextContent('Total: 3 linhas');
    expect(screen.getByTestId('ez-entity-grid-selected-count')).toHaveTextContent('0 selecionadas');

    // Select first row (amount: 100)
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[1]);

    expect(screen.getByTestId('ez-entity-grid-selected-count')).toHaveTextContent('1 selecionada');
    const metrics = screen.getByTestId('ez-entity-grid-selection-metrics');
    expect(metrics).toHaveTextContent('Contagem: 1');
    expect(metrics).toHaveTextContent('Soma: 100,00');
    expect(metrics).toHaveTextContent('Média: 100,00');

    // Select second row (amount: 250.5) -> sum = 350.5, avg = 175.25
    await user.click(checkboxes[2]);
    expect(screen.getByTestId('ez-entity-grid-selected-count')).toHaveTextContent('2 selecionadas');
    expect(metrics).toHaveTextContent('Contagem: 2');
    expect(metrics).toHaveTextContent('Soma: 350,50');
    expect(metrics).toHaveTextContent('Média: 175,25');
  });

  it('opens Excel-style column filter popover on funnel click and filters data by distinct values', async () => {
    const user = userEvent.setup();
    render(<EzEntityGrid columns={columns} data={data} />);

    // Prioridade column filter button
    const filterBtn = screen.getByTestId('ez-grid-column-filter-priority');
    expect(filterBtn).toBeInTheDocument();

    await user.click(filterBtn);

    // Popover is open
    const popover = screen.getByTestId('ez-grid-column-filter-popover');
    expect(popover).toBeInTheDocument();
    expect(screen.getByText('Filtro: Prioridade')).toBeInTheDocument();

    // Check unique values in list: Alta (1), Baixa (1), Média (1)
    expect(screen.getByTestId('ez-grid-column-filter-item-Alta')).toBeChecked();
    expect(screen.getByTestId('ez-grid-column-filter-item-Baixa')).toBeChecked();
    expect(screen.getByTestId('ez-grid-column-filter-item-Média')).toBeChecked();

    // Uncheck "Baixa" and "Média" so only "Alta" is selected
    await user.click(screen.getByTestId('ez-grid-column-filter-item-Baixa'));
    await user.click(screen.getByTestId('ez-grid-column-filter-item-Média'));

    // Click Aplicar
    await user.click(screen.getByTestId('ez-grid-column-filter-apply'));

    // Popover closed
    expect(screen.queryByTestId('ez-grid-column-filter-popover')).not.toBeInTheDocument();

    // Only 'Impressora não liga' (Alta) remains
    expect(screen.getByText('Impressora não liga')).toBeInTheDocument();
    expect(screen.queryByText('Erro ao salvar chamado')).not.toBeInTheDocument();
    expect(screen.queryByText('Acesso ao sistema negado')).not.toBeInTheDocument();

    // Status bar shows filtered count: "Filtradas: 1 de 3 linhas"
    expect(screen.getByTestId('ez-entity-grid-total-count')).toHaveTextContent('Filtradas: 1 de 3 linhas');
  });

  it('clears column filter restoring all rows', async () => {
    const user = userEvent.setup();
    render(<EzEntityGrid columns={columns} data={data} />);

    const filterBtn = screen.getByTestId('ez-grid-column-filter-priority');
    await user.click(filterBtn);

    // Uncheck "Alta"
    await user.click(screen.getByTestId('ez-grid-column-filter-item-Alta'));
    await user.click(screen.getByTestId('ez-grid-column-filter-apply'));

    expect(screen.queryByText('Impressora não liga')).not.toBeInTheDocument();
    expect(screen.getByText('Erro ao salvar chamado')).toBeInTheDocument();

    // Reopen filter and click Limpar
    await user.click(filterBtn);
    await user.click(screen.getByTestId('ez-grid-column-filter-clear'));

    // All rows back
    expect(screen.getByText('Impressora não liga')).toBeInTheDocument();
    expect(screen.getByText('Erro ao salvar chamado')).toBeInTheDocument();
    expect(screen.getByText('Acesso ao sistema negado')).toBeInTheDocument();
    expect(screen.getByTestId('ez-entity-grid-total-count')).toHaveTextContent('Total: 3 linhas');
  });

  it('searches values within filter popover and uses select all', async () => {
    const user = userEvent.setup();
    render(<EzEntityGrid columns={columns} data={data} />);

    const filterBtn = screen.getByTestId('ez-grid-column-filter-title');
    await user.click(filterBtn);

    const searchInput = screen.getByTestId('ez-grid-column-filter-search');
    await user.type(searchInput, 'Impressora');

    // Only "Impressora não liga" is visible inside the popover checklist
    const popover = screen.getByTestId('ez-grid-column-filter-popover');
    expect(within(popover).getByText('Impressora não liga')).toBeInTheDocument();
    expect(within(popover).queryByText('Erro ao salvar chamado')).not.toBeInTheDocument();

    // Toggle select all
    const selectAll = screen.getByTestId('ez-grid-column-filter-select-all');
    await user.click(selectAll); // unselects visible
    expect(screen.getByTestId('ez-grid-column-filter-item-Impressora não liga')).not.toBeChecked();

    await user.click(selectAll); // selects visible
    expect(screen.getByTestId('ez-grid-column-filter-item-Impressora não liga')).toBeChecked();
  });

  it('does not render column filter buttons when enableColumnFilters is false', () => {
    render(<EzEntityGrid columns={columns} data={data} enableColumnFilters={false} />);
    expect(screen.queryByTestId('ez-grid-column-filter-title')).not.toBeInTheDocument();
    expect(screen.queryByTestId('ez-grid-column-filter-priority')).not.toBeInTheDocument();
  });

  it('does not render status bar when showStatusBar is false', () => {
    render(<EzEntityGrid columns={columns} data={data} showStatusBar={false} />);
    expect(screen.queryByTestId('ez-entity-grid-status-bar')).not.toBeInTheDocument();
  });
});

describe('EzEntityGrid Sankhya JS AG Grid parity features', () => {
  it('renders Sankhya sort indicators (green border for asc, red for desc)', async () => {
    const user = userEvent.setup();
    render(<EzEntityGrid columns={columns} data={data} />);

    // Click to sort ascending
    await user.click(screen.getByRole('columnheader', { name: 'Título' }));
    expect(screen.getByTestId('sk-col-orderned-asc')).toBeInTheDocument();

    // Click again to sort descending
    await user.click(screen.getByRole('columnheader', { name: 'Título' }));
    expect(screen.getByTestId('sk-col-orderned-desc')).toBeInTheDocument();
  });

  it('renders zebra striping and vertical dividers on body cells', () => {
    render(<EzEntityGrid columns={columns} data={data} zebraStriping />);

    const rows = screen.getAllByRole('row').slice(1);
    expect(rows[1]).toHaveClass('bg-gray-50/60');

    // First cell in row has border-r border-gray-100
    const cells = within(rows[0]).getAllByRole('cell');
    expect(cells[0]).toHaveClass('border-r', 'border-gray-100');
    // Last cell does not have border-r
    expect(cells[cells.length - 1]).not.toHaveClass('border-r');
  });

  it('opens column header menu and sorts via menu action', async () => {
    const user = userEvent.setup();
    render(<EzEntityGrid columns={columns} data={data} />);

    const menuBtn = screen.getByTestId('ez-grid-column-menu-title');
    await user.click(menuBtn);

    const menuPopover = screen.getByTestId('ez-grid-column-menu-popover');
    expect(menuPopover).toBeInTheDocument();
    expect(within(menuPopover).getByText('Ordenar Ascendente')).toBeInTheDocument();
    expect(within(menuPopover).getByText('Ordenar Descendente')).toBeInTheDocument();
    expect(within(menuPopover).getByText('Filtrar...')).toBeInTheDocument();
    expect(within(menuPopover).getByText('Fixar à Esquerda')).toBeInTheDocument();

    // Click sort asc in menu
    await user.click(screen.getByTestId('ez-grid-column-menu-sort-asc'));
    expect(screen.getByTestId('sk-col-orderned-asc')).toBeInTheDocument();
  });

  it('provides "Todos" and "Filtrados" tabs in the Excel filter popover', async () => {
    const user = userEvent.setup();
    render(<EzEntityGrid columns={columns} data={data} />);

    await user.click(screen.getByTestId('ez-grid-column-filter-title'));

    const tabAll = screen.getByTestId('ez-grid-filter-tab-all');
    const tabFiltered = screen.getByTestId('ez-grid-filter-tab-filtered');
    expect(tabAll).toBeInTheDocument();
    expect(tabFiltered).toBeInTheDocument();

    // Switch to filtered tab
    await user.click(tabFiltered);
    expect(screen.getByTestId('ez-grid-column-filter-item-Impressora não liga')).toBeInTheDocument();
  });

  it('renders AG Grid corner menu and toggles density', async () => {
    const user = userEvent.setup();
    render(<EzEntityGrid columns={columns} data={data} density="compact" />);

    const cornerBtn = screen.getByTestId('ez-grid-corner-menu-button');
    expect(cornerBtn).toBeInTheDocument();

    await user.click(cornerBtn);
    const cornerMenu = screen.getByTestId('ez-grid-corner-menu');
    expect(cornerMenu).toBeInTheDocument();
    expect(screen.getByTestId('ez-grid-corner-toggle-density')).toBeInTheDocument();

    // Toggle density
    await user.click(screen.getByTestId('ez-grid-corner-toggle-density'));
    const headers = screen.getAllByRole('columnheader');
    expect(headers[0]).toHaveClass('py-3');
  });

  it('opens Grid Statistics modal and displays numeric metrics', async () => {
    const user = userEvent.setup();
    render(<EzEntityGrid columns={columnsWithAmount} data={data} />);

    const statsBtn = screen.getByTestId('ez-grid-open-statistics-button');
    expect(statsBtn).toBeInTheDocument();

    await user.click(statsBtn);
    const modal = screen.getByTestId('ez-grid-statistics-modal');
    expect(modal).toBeInTheDocument();
    expect(within(modal).getByText('Valor')).toBeInTheDocument();
    expect(within(modal).getByText('400,00')).toBeInTheDocument(); // sum
    expect(within(modal).getByText('3')).toBeInTheDocument(); // occurrences

    // Close button
    await user.click(within(modal).getByRole('button', { name: 'Fechar' }));
    expect(screen.queryByTestId('ez-grid-statistics-modal')).not.toBeInTheDocument();
  });

  it('opens Column Configurator modal and toggles column visibility', async () => {
    const user = userEvent.setup();
    render(<EzEntityGrid columns={columns} data={data} />);

    // Open corner menu
    await user.click(screen.getByTestId('ez-grid-corner-menu-button'));
    // Open column config modal
    await user.click(screen.getByTestId('ez-grid-corner-configure-columns'));

    const configModal = screen.getByTestId('ez-grid-column-config-modal');
    expect(configModal).toBeInTheDocument();

    // Toggle off "Prioridade" column
    const togglePriority = screen.getByTestId('ez-grid-config-toggle-priority');
    expect(togglePriority).toBeChecked();
    await user.click(togglePriority);
    // Close modal
    await user.click(within(configModal).getByRole('button', { name: 'Concluir' }));
    expect(screen.queryByRole('columnheader', { name: 'Prioridade' })).not.toBeInTheDocument();
  });

  it('renders sequential row numbers when showRowNumbers is true', () => {
    render(<EzEntityGrid columns={columns} data={data} showRowNumbers />);

    const rowNumbers = screen.getAllByTestId('ez-grid-row-number');
    expect(rowNumbers).toHaveLength(3);
    expect(rowNumbers[0]).toHaveTextContent('1');
    expect(rowNumbers[1]).toHaveTextContent('2');
    expect(rowNumbers[2]).toHaveTextContent('3');
  });

  it('respects initialColumnVisibility prop to hide specified columns on mount', () => {
    render(
      <EzEntityGrid
        columns={columns}
        data={data}
        initialColumnVisibility={{ priority: false }}
      />
    );

    expect(screen.getByRole('columnheader', { name: 'Título' })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Prioridade' })).not.toBeInTheDocument();
  });

  it('hides column directly via "Ocultar esta Coluna" in column menu', async () => {
    const user = userEvent.setup();
    render(<EzEntityGrid columns={columns} data={data} />);

    expect(screen.getByRole('columnheader', { name: 'Prioridade' })).toBeInTheDocument();

    const menuBtn = screen.getByTestId('ez-grid-column-menu-priority');
    await user.click(menuBtn);

    const hideBtn = screen.getByTestId('ez-grid-column-menu-hide');
    expect(hideBtn).toBeInTheDocument();
    await user.click(hideBtn);

    expect(screen.queryByRole('columnheader', { name: 'Prioridade' })).not.toBeInTheDocument();
  });

  it('opens Column Configurator modal from taskbar CONFIGURATOR action', async () => {
    const user = userEvent.setup();
    render(
      <EzEntityGrid
        columns={columns}
        data={data}
        taskbarButtons={['CONFIGURATOR']}
      />
    );

    const configBtn = screen.getByRole('button', { name: 'Configurador' });
    await user.click(configBtn);

    expect(screen.getByTestId('ez-grid-column-config-modal')).toBeInTheDocument();
  });

  it('supports custom columnOrder and drag-and-drop reordering (Sankhya AG Grid parity)', () => {
    const onColumnOrderChange = vi.fn();
    render(
      <EzEntityGrid
        columns={columns}
        data={data}
        columnOrder={['priority', 'title', 'id']}
        onColumnOrderChange={onColumnOrderChange}
      />
    );

    const headers = screen.getAllByRole('columnheader');
    expect(headers[0]).toHaveTextContent('Prioridade');
    expect(headers[1]).toHaveTextContent('Título');
    expect(headers[2]).toHaveTextContent('ID');
  });
});



