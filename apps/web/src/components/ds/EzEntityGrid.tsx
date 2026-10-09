import {
  forwardRef,
  HTMLAttributes,
  Ref,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ColumnDef,
  ColumnPinningState,
  ExpandedState,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getGroupedRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  GroupingState,
  RowSelectionState,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
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
  /**
   * Column ids to pin to the left and/or right edge of the grid (mirrors AG Grid's `pinned`
   * columns in Sankhya's financial screens, e.g. keeping an "amount" column visible while
   * scrolling horizontally). Supports multiple columns per side — each gets a cumulative
   * `left`/`right` offset measured from the rendered header widths, so a 2nd pinned column
   * sticks right after the 1st instead of overlapping it. Pinned cells get `position: sticky`
   * plus a `data-pinned` attribute so consumers can style the sticky boundary (shadow/border)
   * if desired. Omit to keep the original column order with no pinning.
   */
  pinnedColumns?: { left?: string[]; right?: string[] };
  /**
   * Column ids to group rows by, in order (mirrors AG Grid's row grouping in Sankhya's
   * financial screens, e.g. grouping entries by "category" or "status"). Groups render as a
   * collapsed summary row (label + row count) that expands on click to reveal its leaf rows —
   * only one level of grouping is supported (`groupBy[0]`); extra ids are accepted but ignored,
   * matching table-core's own fallback for unknown column ids. Omit to render flat rows as usual.
   *
   * Not tested/supported in combination with `pageSize`: pagination slices the *group rows*
   * themselves (not the total leaf count), so a small `pageSize` can push whole groups to a
   * later page even though their leaves would otherwise fit. Avoid combining the two props
   * until this is covered.
   */
  groupBy?: string[];
  /**
   * Vertical row density.
   * - `compact`: ~25px row height (`py-1` on cells, `py-1.5` on headers), matches Sankhya ERP grid density.
   * - `comfortable`: ~44-48px row height (`py-3`).
   * @default 'compact'
   */
  density?: 'compact' | 'comfortable';
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
    pinnedColumns,
    groupBy,
    density = 'compact',
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
  const columnPinning = useMemo<ColumnPinningState>(
    () => ({ left: pinnedColumns?.left ?? [], right: pinnedColumns?.right ?? [] }),
    [pinnedColumns]
  );
  // Only a single level of grouping is supported today (mirrors the JSDoc on `groupBy`).
  const grouping = useMemo<GroupingState>(
    () => (groupBy && groupBy.length > 0 ? [groupBy[0]] : []),
    [groupBy]
  );
  const [expanded, setExpanded] = useState<ExpandedState>({});

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
    state: { sorting, rowSelection, pagination, columnPinning, grouping, expanded },
    enableRowSelection: selectable,
    enableGrouping: grouping.length > 0,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    // Row grouping already needs expand/collapse for its own group rows; keep the whole
    // leaf set in the "current page" instead of only expanding within a sliced page window.
    paginateExpandedRows: false,
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

  const orderedHeaders = useMemo(
    () => [
      ...table.getLeftHeaderGroups().flatMap((group) => group.headers),
      ...table.getCenterHeaderGroups().flatMap((group) => group.headers),
      ...table.getRightHeaderGroups().flatMap((group) => group.headers),
    ],
    [table, columnPinning, resolvedColumns]
  );

  // Pinned columns stick via `position: sticky`, but a left/right offset of 0 for every
  // pinned cell only works correctly for a single column per side — with two+ columns on
  // the same side they would all stick to the same edge and overlap. We measure each pinned
  // header's rendered width and turn that into a cumulative `left`/`right` offset (same idea
  // AG Grid uses internally), so e.g. a 2nd left-pinned column sticks right after the 1st.
  const headerCellRefs = useRef<Map<string, HTMLTableCellElement>>(new Map());
  const [pinnedOffsets, setPinnedOffsets] = useState<Record<string, number>>({});
  const registerHeaderCellRef = useCallback(
    (columnId: string) => (el: HTMLTableCellElement | null) => {
      if (el) headerCellRefs.current.set(columnId, el);
      else headerCellRefs.current.delete(columnId);
    },
    []
  );

  const pinnedColumnsKey = useMemo(() => {
    const left = orderedHeaders
      .filter((header) => header.column.getIsPinned() === 'left')
      .map((header) => header.column.id);
    const right = orderedHeaders
      .filter((header) => header.column.getIsPinned() === 'right')
      .map((header) => header.column.id);
    return JSON.stringify({ left, right });
  }, [orderedHeaders]);

  useLayoutEffect(() => {
    const { left, right } = JSON.parse(pinnedColumnsKey) as { left: string[]; right: string[] };
    const offsets: Record<string, number> = {};

    let leftAcc = 0;
    for (const columnId of left) {
      offsets[columnId] = leftAcc;
      leftAcc += headerCellRefs.current.get(columnId)?.offsetWidth ?? 0;
    }

    // Right-pinned columns accumulate from the outer edge inward: the LAST id in
    // `pinnedColumns.right` sits flush against the grid's right edge (offset 0).
    let rightAcc = 0;
    for (const columnId of [...right].reverse()) {
      offsets[columnId] = rightAcc;
      rightAcc += headerCellRefs.current.get(columnId)?.offsetWidth ?? 0;
    }

    setPinnedOffsets((previous) => {
      const previousKeys = Object.keys(previous);
      const nextKeys = Object.keys(offsets);
      const unchanged =
        previousKeys.length === nextKeys.length &&
        nextKeys.every((key) => previous[key] === offsets[key]);
      return unchanged ? previous : offsets;
    });
  }, [pinnedColumnsKey, data]);

  const pinnedStyle = (columnId: string, pinned: false | 'left' | 'right') =>
    pinned ? { [pinned]: pinnedOffsets[columnId] ?? 0 } : undefined;

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
          <tr>
            {orderedHeaders.map((header, headerIndex) => {
              const canSort = header.column.getCanSort();
              const sortDirection = header.column.getIsSorted();
              const SortIcon =
                sortDirection === 'asc' ? ArrowUp : sortDirection === 'desc' ? ArrowDown : ArrowUpDown;
              const pinned = header.column.getIsPinned();
              const isLast = headerIndex === orderedHeaders.length - 1;

              return (
                <th
                  key={header.id}
                  ref={registerHeaderCellRef(header.column.id)}
                  data-pinned={pinned || undefined}
                  style={pinnedStyle(header.column.id, pinned)}
                  className={cn(
                    'px-4 text-[13px] font-semibold text-gray-700 select-none bg-gray-80',
                    density === 'compact' ? 'py-1.5' : 'py-3',
                    !isLast && 'border-r border-gray-100',
                    canSort && 'cursor-pointer',
                    pinned && 'sticky z-10',
                    pinned === 'left' && 'shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)]',
                    pinned === 'right' && 'shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.15)]'
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
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => {
            if (row.getIsGrouped()) {
              const toggleExpanded = row.getToggleExpandedHandler();
              // `row.groupingValue` is already coerced to a string key internally by
              // table-core's getGroupedRowModel (it builds a `Map<string, Row[]>`), so an
              // `undefined`/`null` grouping value arrives here as the *string* "undefined" —
              // comparing `row.groupingValue === undefined` never matches. Read the real,
              // un-coerced value straight off the row via the grouped column id instead.
              const rawGroupingValue = row.getValue(row.groupingColumnId ?? '');
              const groupLabel =
                rawGroupingValue === undefined || rawGroupingValue === null
                  ? '(Sem valor)'
                  : String(rawGroupingValue);
              return (
                <tr
                  key={row.id}
                  data-testid="ez-entity-grid-group-row"
                  role="button"
                  tabIndex={0}
                  className="border-t border-gray-200 bg-gray-80 cursor-pointer hover:bg-gray-80/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-200"
                  onClick={toggleExpanded}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleExpanded();
                    }
                  }}
                >
                  <td
                    colSpan={resolvedColumns.length}
                    className={cn(
                      'px-4 text-[13px] font-semibold text-gray-900',
                      density === 'compact' ? 'py-1' : 'py-3'
                    )}
                  >
                    <span className="inline-flex items-center gap-2">
                      {row.getIsExpanded() ? (
                        <ChevronDown aria-hidden className="w-3.5 h-3.5 text-gray-500" />
                      ) : (
                        <ChevronRight aria-hidden className="w-3.5 h-3.5 text-gray-500" />
                      )}
                      {groupLabel}
                      <span className="inline-flex items-center justify-center min-w-[1.25rem] px-1.5 py-0.5 rounded-full bg-gray-200 text-[11px] font-medium text-gray-700">
                        {row.subRows.length}
                      </span>
                    </span>
                  </td>
                </tr>
              );
            }

            const isSelected = row.getIsSelected();
            return (
              <tr
                key={row.id}
                data-selected={isSelected || undefined}
                className={cn(
                  'border-t border-gray-200 group transition-colors',
                  isSelected ? 'bg-brand-50' : 'hover:bg-grid-row-hover'
                )}
              >
                {[
                  ...row.getLeftVisibleCells(),
                  ...row.getCenterVisibleCells(),
                  ...row.getRightVisibleCells(),
                ].map((cell) => {
                  const pinned = cell.column.getIsPinned();
                  return (
                    <td
                      key={cell.id}
                      data-pinned={pinned || undefined}
                      style={pinnedStyle(cell.column.id, pinned)}
                      className={cn(
                        'px-4 text-[13px] text-gray-900',
                        density === 'compact' ? 'py-1' : 'py-3',
                        pinned && 'sticky z-10',
                        pinned &&
                          (isSelected
                            ? 'bg-brand-50'
                            : 'bg-white group-hover:bg-grid-row-hover'),
                        pinned === 'left' && 'shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)]',
                        pinned === 'right' && 'shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.15)]'
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}
              </tr>
            );
          })}
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
              {orderedHeaders.map((header) => {
                const columnId = header.column.id;
                const value = footerValues[columnId];
                const pinned = header.column.getIsPinned();
                return (
                  <td
                    key={columnId}
                    data-pinned={pinned || undefined}
                    style={pinnedStyle(columnId, pinned)}
                    className={cn(
                      'px-4 text-[13px] font-semibold text-gray-900',
                      density === 'compact' ? 'py-1' : 'py-3',
                      pinned && 'sticky z-10 bg-gray-80',
                      pinned === 'left' && 'shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)]',
                      pinned === 'right' && 'shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.15)]'
                    )}
                  >
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
