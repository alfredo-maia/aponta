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
import { createPortal } from 'react-dom';
import {
  ColumnDef,
  ColumnFiltersState,
  ColumnPinningState,
  ExpandedState,
  FilterFn,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
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
  Filter,
  Search,
  X,
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
  /** Available page size choices in the rich pagination dropdown. @default [5, 10, 20, 50, 100] */
  pageSizeOptions?: number[];
  /** Callback fired whenever the user changes the page size via the dropdown selector. */
  onPageSizeChange?: (newPageSize: number) => void;
  /**
   * Whether to display the persistent AG Grid style horizontal scrollbar on overflow.
   * @default true
   */
  showHorizontalScrollbar?: boolean;
  /**
   * Forces the horizontal scrollbar to always show regardless of measured overflow.
   * Useful in tests and Storybook.
   * @default false
   */
  alwaysShowHorizontalScrollbar?: boolean;
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
  /**
   * Enables Excel-style column filters (funnel icon on header) with distinct values checklist.
   * @default true
   */
  enableColumnFilters?: boolean;
  /**
   * Displays the bottom status bar with row counts and selection metrics (Sankhya / Excel parity).
   * @default true
   */
  showStatusBar?: boolean;
};

const inArrayFilter: FilterFn<any> = (row, columnId, filterValue: unknown) => {
  if (!filterValue || !Array.isArray(filterValue)) return true;
  const raw = row.getValue(columnId);
  const formatted = raw === undefined || raw === null || raw === '' ? '(Vazio)' : String(raw);
  return (filterValue as string[]).includes(formatted);
};

interface EzColumnFilterPopoverProps {
  triggerElement: HTMLElement | null | undefined;
  columnTitle: string;
  uniqueValues: { value: string; count: number }[];
  currentFilter: string[] | undefined;
  onApply: (selectedValues: string[] | undefined) => void;
  onClose: () => void;
}

function EzColumnFilterPopover({
  triggerElement,
  columnTitle,
  uniqueValues,
  currentFilter,
  onApply,
  onClose,
}: EzColumnFilterPopoverProps) {
  const allValues = useMemo(() => uniqueValues.map((v) => v.value), [uniqueValues]);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(currentFilter !== undefined ? currentFilter : allValues)
  );
  const [search, setSearch] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (triggerElement) {
      const rect = triggerElement.getBoundingClientRect();
      const popoverWidth = 256;
      let left = rect.right - popoverWidth;
      if (typeof window !== 'undefined') {
        if (left < 8) left = 8;
        if (left + popoverWidth > window.innerWidth - 8) {
          left = Math.max(8, window.innerWidth - popoverWidth - 8);
        }
      }
      setCoords({
        top: rect.bottom + 6,
        left,
      });
    }
  }, [triggerElement]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        (!triggerElement || !triggerElement.contains(target))
      ) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, triggerElement]);

  const visibleValues = useMemo(() => {
    if (!search.trim()) return uniqueValues;
    const lower = search.toLowerCase();
    return uniqueValues.filter((v) => v.value.toLowerCase().includes(lower));
  }, [uniqueValues, search]);

  const isAllVisibleSelected =
    visibleValues.length > 0 && visibleValues.every((v) => selected.has(v.value));

  const toggleSelectAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (isAllVisibleSelected) {
        visibleValues.forEach((v) => next.delete(v.value));
      } else {
        visibleValues.forEach((v) => next.add(v.value));
      }
      return next;
    });
  };

  const toggleItem = (val: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(val)) next.delete(val);
      else next.add(val);
      return next;
    });
  };

  const handleApply = () => {
    if (selected.size === allValues.length) {
      onApply(undefined);
    } else {
      onApply(Array.from(selected));
    }
    onClose();
  };

  const handleClear = () => {
    onApply(undefined);
    onClose();
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={popoverRef}
      role="dialog"
      aria-label={`Filtrar ${columnTitle}`}
      data-testid="ez-grid-column-filter-popover"
      style={
        coords
          ? {
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
            }
          : { position: 'fixed', top: '100px', left: '100px' }
      }
      className="w-64 bg-white rounded-[10px] shadow-2xl border border-gray-200 z-[9999] p-3 flex flex-col gap-2.5 text-left font-normal select-none"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between pb-1.5 border-b border-gray-100">
        <span className="text-[12px] font-semibold text-gray-800 truncate">
          Filtro: {columnTitle}
        </span>
        <button
          type="button"
          aria-label="Fechar filtro"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 p-0.5 rounded hover:bg-gray-100 transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar valores…"
          aria-label="Pesquisar valores"
          data-testid="ez-grid-column-filter-search"
          className="w-full text-[12px] px-2.5 py-1.5 pl-7 bg-gray-50 border border-gray-200 rounded-[6px] focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2 top-2 pointer-events-none" />
      </div>

      <div className="flex items-center gap-2 px-1 text-[12px] text-gray-600">
        <input
          type="checkbox"
          id={`filter-select-all-${columnTitle}`}
          checked={isAllVisibleSelected}
          onChange={toggleSelectAll}
          data-testid="ez-grid-column-filter-select-all"
          className="w-3.5 h-3.5 rounded border-gray-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
        />
        <label htmlFor={`filter-select-all-${columnTitle}`} className="cursor-pointer font-medium">
          (Selecionar tudo)
        </label>
      </div>

      <div className="max-h-40 overflow-y-auto space-y-0.5 pr-1 text-[12px] border-y border-gray-100 py-1.5">
        {visibleValues.length === 0 ? (
          <div className="text-gray-400 text-center py-2 text-[12px]">Nenhum valor encontrado</div>
        ) : (
          visibleValues.map((item) => (
            <label
              key={item.value}
              className="flex items-center justify-between gap-2 px-1 py-1 rounded hover:bg-gray-50 cursor-pointer"
            >
              <div className="flex items-center gap-2 truncate">
                <input
                  type="checkbox"
                  checked={selected.has(item.value)}
                  onChange={() => toggleItem(item.value)}
                  data-testid={`ez-grid-column-filter-item-${item.value}`}
                  className="w-3.5 h-3.5 rounded border-gray-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                />
                <span className="truncate text-gray-700" title={item.value}>
                  {item.value}
                </span>
              </div>
              <span className="text-gray-400 text-[11px] shrink-0">({item.count})</span>
            </label>
          ))
        )}
      </div>

      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={handleClear}
          data-testid="ez-grid-column-filter-clear"
          className="text-[12px] text-gray-500 hover:text-gray-800 px-2 py-1 rounded hover:bg-gray-100 transition-colors cursor-pointer"
        >
          Limpar
        </button>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onClose}
            className="text-[12px] text-gray-600 hover:text-gray-900 px-2.5 py-1 rounded border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleApply}
            data-testid="ez-grid-column-filter-apply"
            className="text-[12px] text-white bg-brand-600 hover:bg-brand-700 px-3 py-1 rounded-[6px] font-medium shadow-sm transition-colors cursor-pointer"
          >
            Aplicar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

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
    pageSizeOptions,
    onPageSizeChange,
    showHorizontalScrollbar = true,
    alwaysShowHorizontalScrollbar = false,
    footerAggregations,
    pinnedColumns,
    groupBy,
    density = 'compact',
    enableColumnFilters = true,
    showStatusBar = true,
    className,
    ...props
  }: EzEntityGridProps<T>,
  ref: Ref<HTMLDivElement>
) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [activeFilterColumnId, setActiveFilterColumnId] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: pageSize ?? Math.max(data.length, 1),
  });

  useEffect(() => {
    if (pageSize !== undefined) {
      setPagination((prev) => (prev.pageSize === pageSize ? prev : { ...prev, pageSize }));
    }
  }, [pageSize]);

  const defaultPageSizeOptions = useMemo(() => [5, 10, 20, 50, 100], []);
  const resolvedPageSizeOptions = useMemo(() => {
    const base = pageSizeOptions ?? defaultPageSizeOptions;
    if (pageSize !== undefined && !base.includes(pageSize)) {
      return [...base, pageSize].sort((a, b) => a - b);
    }
    return base;
  }, [pageSizeOptions, defaultPageSizeOptions, pageSize]);

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextSize = Number(e.target.value);
    table.setPageSize(nextSize);
    onPageSizeChange?.(nextSize);
  };
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

  const table = useReactTable<T>({
    data,
    columns: resolvedColumns,
    state: {
      sorting,
      rowSelection,
      pagination,
      columnPinning,
      grouping,
      expanded,
      columnFilters,
    },
    enableRowSelection: selectable,
    enableGrouping: grouping.length > 0,
    enableFilters: enableColumnFilters,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    onExpandedChange: setExpanded,
    filterFns: {
      inArray: inArrayFilter,
    },
    defaultColumn: {
      filterFn: inArrayFilter,
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    // Row grouping already needs expand/collapse for its own group rows; keep the whole
    // leaf set in the "current page" instead of only expanding within a sliced page window.
    paginateExpandedRows: false,
  });

  const filterButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const getColumnUniqueValues = useCallback(
    (columnId: string) => {
      const counts = new Map<string, number>();
      for (const row of table.getCoreRowModel().rows) {
        const raw = row.getValue(columnId);
        const val = raw === undefined || raw === null || raw === '' ? '(Vazio)' : String(raw);
        counts.set(val, (counts.get(val) ?? 0) + 1);
      }
      return Array.from(counts.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => a.value.localeCompare(b.value));
    },
    [table]
  );

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
    const filteredRows = table.getFilteredRowModel().rows;
    for (const [columnId, aggregation] of Object.entries(footerAggregations ?? {})) {
      const values = filteredRows
        .map((row) => (row.original as Record<string, unknown>)[columnId])
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, columnFilters, footerAggregations, showFooter]);

  const selectedMetrics = useMemo(() => {
    const selectedRows = table.getSelectedRowModel().rows;
    if (selectedRows.length === 0) return null;

    const aggregationKeys = footerAggregations ? Object.keys(footerAggregations) : [];
    const firstRow = data[0] as Record<string, unknown> | undefined;

    let candidateKeys = aggregationKeys;
    if (candidateKeys.length === 0 && firstRow) {
      candidateKeys = Object.keys(firstRow).filter(
        (key) => typeof firstRow[key] === 'number' && key !== 'id'
      );
    }

    if (candidateKeys.length === 0) {
      return { count: selectedRows.length };
    }

    let sum = 0;
    let numericCount = 0;
    for (const row of selectedRows) {
      const orig = row.original as Record<string, unknown>;
      for (const key of candidateKeys) {
        const val = orig[key];
        if (typeof val === 'number') {
          sum += val;
          numericCount++;
        }
      }
    }

    if (numericCount === 0) {
      return { count: selectedRows.length };
    }

    return {
      count: selectedRows.length,
      sum,
      avg: sum / numericCount,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, rowSelection, data, footerAggregations]);

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

      <EzGridWrapper
        showHorizontalScrollbar={showHorizontalScrollbar}
        alwaysShowHorizontalScrollbar={alwaysShowHorizontalScrollbar}
      >
        <thead className="bg-gray-80">
          <tr>
            {orderedHeaders.map((header, headerIndex) => {
              const canSort = header.column.getCanSort();
              const sortDirection = header.column.getIsSorted();
              const SortIcon =
                sortDirection === 'asc' ? ArrowUp : sortDirection === 'desc' ? ArrowDown : ArrowUpDown;
              const pinned = header.column.getIsPinned();
              const isLast = headerIndex === orderedHeaders.length - 1;
              const columnHeader = header.column.columnDef.header;
              const columnHeaderLabel =
                typeof columnHeader === 'string'
                  ? columnHeader
                  : (header.column.columnDef.id ?? header.column.id);
              const canFilter =
                enableColumnFilters &&
                header.column.id !== 'select' &&
                header.column.getCanFilter();
              const isFiltered = header.column.getIsFiltered();

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
                  <div className="flex items-center justify-between gap-1.5 w-full">
                    <span className="inline-flex items-center gap-1 truncate">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {canSort && <SortIcon aria-hidden className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
                    </span>
                    {canFilter && (
                      <button
                        ref={(el) => {
                          if (el) filterButtonRefs.current.set(header.column.id, el);
                          else filterButtonRefs.current.delete(header.column.id);
                        }}
                        type="button"
                        aria-hidden="true"
                        tabIndex={-1}
                        title={`Filtrar por ${columnHeaderLabel}`}
                        data-testid={`ez-grid-column-filter-${header.column.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveFilterColumnId(
                            activeFilterColumnId === header.column.id ? null : header.column.id
                          );
                        }}
                        className={cn(
                          'p-1 rounded hover:bg-gray-200 transition-colors cursor-pointer shrink-0',
                          isFiltered
                            ? 'text-brand-600 bg-brand-50 hover:bg-brand-100'
                            : 'text-gray-400 hover:text-gray-600'
                        )}
                      >
                        <Filter className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
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

      {showStatusBar && (
        <div
          data-testid="ez-entity-grid-status-bar"
          className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-[8px] text-[12px] text-gray-600 select-none"
        >
          <div className="flex items-center gap-3">
            <span data-testid="ez-entity-grid-total-count" className="font-medium text-gray-700">
              {table.getState().columnFilters.length > 0
                ? `Filtradas: ${table.getFilteredRowModel().rows.length} de ${data.length} linhas`
                : `Total: ${data.length} linha${data.length !== 1 ? 's' : ''}`}
            </span>
            {selectable && (
              <>
                <span className="text-gray-300">|</span>
                <span data-testid="ez-entity-grid-selected-count">
                  {table.getSelectedRowModel().rows.length} selecionada{table.getSelectedRowModel().rows.length !== 1 ? 's' : ''}
                </span>
              </>
            )}
          </div>

          {selectedMetrics && (
            <div
              data-testid="ez-entity-grid-selection-metrics"
              className="flex items-center gap-3 text-[12px] text-gray-600"
            >
              <span>Contagem: {selectedMetrics.count}</span>
              {selectedMetrics.sum !== undefined && (
                <>
                  <span className="text-gray-300">|</span>
                  <span>Soma: {formatFooterValue(selectedMetrics.sum)}</span>
                </>
              )}
              {selectedMetrics.avg !== undefined && (
                <>
                  <span className="text-gray-300">|</span>
                  <span>Média: {formatFooterValue(selectedMetrics.avg)}</span>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {activeFilterColumnId && (() => {
        const activeCol = table.getColumn(activeFilterColumnId);
        if (!activeCol) return null;
        const columnHeader = activeCol.columnDef.header;
        const label =
          typeof columnHeader === 'string'
            ? columnHeader
            : (activeCol.columnDef.id ?? activeCol.id);
        const triggerEl = filterButtonRefs.current.get(activeFilterColumnId);

        return (
          <EzColumnFilterPopover
            triggerElement={triggerEl}
            columnTitle={label}
            uniqueValues={getColumnUniqueValues(activeFilterColumnId)}
            currentFilter={activeCol.getFilterValue() as string[] | undefined}
            onApply={(selectedValues) => {
              activeCol.setFilterValue(selectedValues);
              setActiveFilterColumnId(null);
            }}
            onClose={() => setActiveFilterColumnId(null)}
          />
        );
      })()}

      {showPagination && (() => {
        const totalCount = table.getFilteredRowModel().rows.length;
        const currentPageIndex = table.getState().pagination.pageIndex;
        const currentPageSize = table.getState().pagination.pageSize;
        const recordStart = totalCount === 0 ? 0 : currentPageIndex * currentPageSize + 1;
        const recordEnd =
          totalCount === 0 ? 0 : Math.min((currentPageIndex + 1) * currentPageSize, totalCount);
        const recordCountText = `${recordStart}-${recordEnd} de ${totalCount}`;

        return (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              <label
                htmlFor="ez-entity-grid-page-size-select"
                className="text-[13px] text-gray-500 select-none"
              >
                Linhas por página:
              </label>
              <select
                id="ez-entity-grid-page-size-select"
                aria-label="Linhas por página:"
                value={table.getState().pagination.pageSize}
                onChange={handlePageSizeChange}
                className="h-[32px] px-2 text-[13px] text-gray-700 bg-white border border-gray-200 rounded-[8px] focus:outline-none focus:ring-2 focus:ring-brand-200 cursor-pointer"
              >
                {resolvedPageSizeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <span
                data-testid="ez-entity-grid-pagination-count"
                className="text-[13px] text-gray-500 font-medium select-none"
              >
                {recordCountText}
              </span>
              <span className="text-[13px] text-gray-500 select-none">
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
          </div>
        );
      })()}
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
