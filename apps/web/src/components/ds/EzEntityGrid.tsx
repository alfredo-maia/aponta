import { forwardRef, HTMLAttributes, Ref, useEffect, useMemo, useRef, useState } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  RowSelectionState,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from './utils';
import { EzGridWrapper } from './EzGrid';
import { EzTaskbar, EzTaskbarButton } from './EzTaskbar';
import { EzFilterBar, FilterDef } from './EzFilterBar';

/**
 * Generic, server-agnostic data grid built by composing the existing DS
 * primitives (`EzGridWrapper` + `@tanstack/react-table`, `EzTaskbar` and
 * `EzFilterBar`). Mirrors the visual behavior of Sankhya's `snk-grid`
 * (sortable columns, row selection, a taskbar, filters and pagination)
 * WITHOUT any coupling to `SnkApplication` / `DataUnit` / `configName` —
 * the screen owns `data`/`columns` and reacts to the callbacks below.
 */
export type EzEntityGridProps<T> = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
  /** Column definitions, in the exact shape expected by `@tanstack/react-table`. */
  columns: ColumnDef<T>[];
  /** Rows rendered by the grid. */
  data: T[];
  /** Ordered list of taskbar button identifiers (see `EzTaskbar`). Omit to hide the taskbar. */
  taskbarButtons?: EzTaskbarButton[];
  /** Called with the button identifier whenever a taskbar action is clicked. */
  onTaskbarAction?: (action: string) => void;
  /** Full list of filters (see `EzFilterBar`). Omit to hide the filter bar. */
  filters?: FilterDef[];
  /** Called with the single updated filter from the filter bar's quick-edit popover. */
  onFilterChange?: (filter: FilterDef) => void;
  /** Called with the full filters list when the user applies changes in the filter modal. */
  onApplyAll?: (filters: FilterDef[]) => void;
  /** Enables a leading checkbox column for multi-row selection. @default false */
  selectable?: boolean;
  /** Called with the currently selected rows (original data items) whenever the selection changes. */
  onSelectionChange?: (rows: T[]) => void;
  /** Number of rows per page. Omit to render every row without pagination controls. */
  pageSize?: number;
  /**
   * Maps a column id to an aggregation to show in a footer row (e.g. `{ amount: 'sum' }`).
   * Omit to hide the footer row entirely. Values are formatted as pt-BR currency-style numbers
   * (2 decimal places, comma separator) to match Sankhya's financial grids.
   */
  footerAggregations?: Record<string, 'sum' | 'avg' | 'min' | 'max' | 'count'>;
};

type EzEntityGridComponent = <T,>(
  props: EzEntityGridProps<T> & { ref?: Ref<HTMLDivElement> }
) => React.ReactElement | null;

function EzEntityGridInner<T>(
  {
    columns,
    data,
    taskbarButtons,
    onTaskbarAction,
    filters,
    onFilterChange,
    onApplyAll,
    selectable = false,
    onSelectionChange,
    pageSize,
    footerAggregations,
    className,
    ...props
  }: EzEntityGridProps<T>,
  ref: Ref<HTMLDivElement>
) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: pageSize ?? Math.max(data.length, 1),
  });

  const resolvedColumns = useMemo<ColumnDef<T>[]>(() => {
    if (!selectable) return columns;
    const selectColumn: ColumnDef<T> = {
      id: 'select',
      enableSorting: false,
      header: ({ table }) => (
        <input
          type="checkbox"
          aria-label="Selecionar todas as linhas"
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
          className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          aria-label="Selecionar linha"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
        />
      ),
    };
    return [selectColumn, ...columns];
  }, [columns, selectable]);

  const table = useReactTable({
    data,
    columns: resolvedColumns,
    state: { sorting, rowSelection, pagination },
    enableRowSelection: selectable,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const isInitialSelectionRender = useRef(true);
  useEffect(() => {
    if (isInitialSelectionRender.current) {
      isInitialSelectionRender.current = false;
      return;
    }
    if (!onSelectionChange) return;
    const selected = table.getSelectedRowModel().rows.map((row) => row.original);
    onSelectionChange(selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowSelection]);

  const showTaskbar = !!taskbarButtons && taskbarButtons.length > 0;
  const showFilterBar = !!filters;
  const showPagination = pageSize !== undefined;
  const showFooter = !!footerAggregations && Object.keys(footerAggregations).length > 0;

  const footerValues = useMemo<Record<string, number>>(() => {
    if (!showFooter) return {};
    const result: Record<string, number> = {};
    for (const [columnId, aggregation] of Object.entries(footerAggregations ?? {})) {
      const values = data
        .map((row) => (row as Record<string, unknown>)[columnId])
        .filter((value): value is number => typeof value === 'number');

      if (values.length === 0) {
        result[columnId] = 0;
        continue;
      }

      switch (aggregation) {
        case 'sum':
          result[columnId] = values.reduce((acc, value) => acc + value, 0);
          break;
        case 'avg':
          result[columnId] = values.reduce((acc, value) => acc + value, 0) / values.length;
          break;
        case 'min':
          result[columnId] = Math.min(...values);
          break;
        case 'max':
          result[columnId] = Math.max(...values);
          break;
        case 'count':
          result[columnId] = values.length;
          break;
      }
    }
    return result;
  }, [data, footerAggregations, showFooter]);

  const formatFooterValue = (value: number) =>
    value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div ref={ref} className={cn('flex flex-col gap-3 w-full', className)} {...props}>
      {showFilterBar && (
        <EzFilterBar
          filters={filters ?? []}
          onFilterChange={onFilterChange ?? (() => undefined)}
          onApplyAll={onApplyAll ?? (() => undefined)}
        />
      )}

      {showTaskbar && (
        <EzTaskbar buttons={taskbarButtons ?? []} onAction={(action) => onTaskbarAction?.(action)} />
      )}

      <EzGridWrapper>
        <thead className="bg-gray-80">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const canSort = header.column.getCanSort();
                const sortDirection = header.column.getIsSorted();
                const SortIcon =
                  sortDirection === 'asc' ? ArrowUp : sortDirection === 'desc' ? ArrowDown : ArrowUpDown;

                return (
                  <th
                    key={header.id}
                    className={cn(
                      'px-4 py-3 text-[13px] font-semibold text-gray-700 select-none',
                      canSort && 'cursor-pointer'
                    )}
                    onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                  >
                    <span className="inline-flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {canSort && <SortIcon aria-hidden className="w-3.5 h-3.5 text-gray-400" />}
                    </span>
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="border-t border-gray-200 hover:bg-gray-80/60">
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-4 py-3 text-[13px] text-gray-900">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
          {table.getRowModel().rows.length === 0 && (
            <tr>
              <td
                colSpan={resolvedColumns.length}
                className="px-4 py-6 text-center text-[13px] text-gray-500"
              >
                Nenhum registro encontrado.
              </td>
            </tr>
          )}
        </tbody>
        {showFooter && (
          <tfoot>
            <tr data-testid="ez-entity-grid-footer-row" className="border-t-2 border-gray-200 bg-gray-80">
              {resolvedColumns.map((column, index) => {
                const columnId =
                  'accessorKey' in column ? String(column.accessorKey) : column.id ?? '';
                const value = footerValues[columnId];
                return (
                  <td key={columnId || index} className="px-4 py-3 text-[13px] font-semibold text-gray-900">
                    {value !== undefined ? formatFooterValue(value) : ''}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        )}
      </EzGridWrapper>

      {showPagination && (
        <div className="flex items-center justify-end gap-3">
          <span className="text-[13px] text-gray-500">
            Página {table.getState().pagination.pageIndex + 1} de {Math.max(table.getPageCount(), 1)}
          </span>
          <button
            type="button"
            aria-label="Página anterior"
            title="Página anterior"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
            className={cn(
              'inline-flex items-center justify-center h-[32px] w-[32px] rounded-[8px] text-gray-500 transition-colors',
              'hover:bg-gray-80 hover:text-gray-900',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none'
            )}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-label="Próxima página"
            title="Próxima página"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
            className={cn(
              'inline-flex items-center justify-center h-[32px] w-[32px] rounded-[8px] text-gray-500 transition-colors',
              'hover:bg-gray-80 hover:text-gray-900',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none'
            )}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Aponta DS Entity Grid (visual behavior mirror of Sankhya DS `snk-grid`).
 * Composes `EzGridWrapper` (+ `@tanstack/react-table`), `EzTaskbar` and
 * `EzFilterBar` into a single generic, fully client-driven data grid with
 * sortable columns, optional multi-row selection and simple pagination.
 */
export const EzEntityGrid = forwardRef(EzEntityGridInner) as EzEntityGridComponent;
(EzEntityGrid as unknown as { displayName?: string }).displayName = 'EzEntityGrid';
