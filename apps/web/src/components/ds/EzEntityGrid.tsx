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
  VisibilityState,
  useReactTable,
} from '@tanstack/react-table';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BarChart3,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Filter,
  MoreVertical,
  Pin,
  PinOff,
  RotateCcw,
  Rows,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { cn } from './utils';
import { EzGridWrapper } from './EzGrid';
import { EzTaskbar, EzTaskbarButton } from './EzTaskbar';
import { EzFilterBar, FilterDef } from './EzFilterBar';

/**
 * Generic, server-agnostic data grid built by composing the existing DS
 * primitives (`EzGridWrapper` + `@tanstack/react-table`, `EzTaskbar` and
 * `EzFilterBar`). Mirrors the visual behavior and UX of Sankhya's `snk-grid`
 * (sortable columns, row selection, taskbar, Excel-style column filters,
 * persistent horizontal scrollbar, status bar metrics, AG Grid corner menu,
 * grid statistics modal and column configurator) WITHOUT any coupling to
 * `SnkApplication` / `DataUnit` / `configName` — the screen owns `data`/`columns`
 * and reacts to the callbacks below.
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
   */
  groupBy?: string[];
  /**
   * Vertical row density.
   * - `compact`: ~20-25px row height (`py-1` on cells, `py-1.5` on headers), matches Sankhya ERP grid density.
   * - `comfortable`: ~40-48px row height (`py-3`).
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
  /**
   * Enables the AG Grid corner menu button in the top right of the table (Sankhya parity).
   * @default true
   */
  showGridCornerMenu?: boolean;
  /**
   * Enables the column header dropdown menu with sort, filter, pin, and group options (Sankhya parity).
   * @default true
   */
  enableColumnMenu?: boolean;
  /**
   * Enables zebra striping on alternating rows (Sankhya parity).
   * @default true
   */
  zebraStriping?: boolean;
  /**
   * Enables keyboard navigation across rows (ArrowUp / ArrowDown, Space to select).
   * @default true
   */
  enableKeyboardNavigation?: boolean;
};

const inArrayFilter: FilterFn<any> = (row, columnId, filterValue: unknown) => {
  if (!filterValue || !Array.isArray(filterValue)) return true;
  const raw = row.getValue(columnId);
  const formatted = raw === undefined || raw === null || raw === '' ? '(Vazio)' : String(raw);
  return (filterValue as string[]).includes(formatted);
};

/* =========================================================================
   1. EXCEL-STYLE COLUMN FILTER POPOVER (Sankhya Parity with Tabs)
   ========================================================================= */
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
  const [activeTab, setActiveTab] = useState<'all' | 'filtered'>('all');
  const popoverRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (triggerElement) {
      const rect = triggerElement.getBoundingClientRect();
      const popoverWidth = 270;
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
    let list = uniqueValues;
    if (activeTab === 'filtered') {
      list = list.filter((v) => selected.has(v.value));
    }
    if (!search.trim()) return list;
    const lower = search.toLowerCase();
    return list.filter((v) => v.value.toLowerCase().includes(lower));
  }, [uniqueValues, activeTab, selected, search]);

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
      className="w-72 bg-white rounded-[10px] shadow-2xl border border-gray-200 z-[9999] p-3 flex flex-col gap-2.5 text-left font-normal select-none"
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

      {/* Tabs: Todos | Filtrados [QTD] (Sankhya filtermodal.tpl.html parity) */}
      <div className="flex border-b border-gray-200 text-[12px]">
        <button
          type="button"
          data-testid="ez-grid-filter-tab-all"
          onClick={() => setActiveTab('all')}
          className={cn(
            'flex-1 py-1 text-center font-medium border-b-2 transition-colors cursor-pointer',
            activeTab === 'all'
              ? 'border-brand-600 text-brand-700 font-semibold'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          )}
        >
          Todos
        </button>
        <button
          type="button"
          data-testid="ez-grid-filter-tab-filtered"
          onClick={() => setActiveTab('filtered')}
          className={cn(
            'flex-1 py-1 text-center font-medium border-b-2 transition-colors cursor-pointer',
            activeTab === 'filtered'
              ? 'border-brand-600 text-brand-700 font-semibold'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          )}
        >
          Filtrados ({selected.size})
        </button>
      </div>

      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar..."
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

/* =========================================================================
   2. COLUMN MENU POPOVER (Sankhya getMainMenuItems Parity)
   ========================================================================= */
interface EzColumnMenuPopoverProps {
  triggerElement: HTMLElement | null | undefined;
  columnTitle: string;
  canSort: boolean;
  sortDirection: false | 'asc' | 'desc';
  canFilter: boolean;
  isPinned: false | 'left' | 'right';
  isGrouped: boolean;
  onSortAsc: () => void;
  onSortDesc: () => void;
  onOpenFilter: () => void;
  onTogglePin: () => void;
  onToggleGroup: () => void;
  onClose: () => void;
}

function EzColumnMenuPopover({
  triggerElement,
  columnTitle,
  canSort,
  sortDirection,
  canFilter,
  isPinned,
  isGrouped,
  onSortAsc,
  onSortDesc,
  onOpenFilter,
  onTogglePin,
  onToggleGroup,
  onClose,
}: EzColumnMenuPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (triggerElement) {
      const rect = triggerElement.getBoundingClientRect();
      const popoverWidth = 200;
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

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={popoverRef}
      role="menu"
      aria-label={`Opções da coluna ${columnTitle}`}
      data-testid="ez-grid-column-menu-popover"
      style={
        coords
          ? {
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
            }
          : { position: 'fixed', top: '100px', left: '100px' }
      }
      className="w-52 bg-white rounded-[10px] shadow-2xl border border-gray-200 z-[9999] p-1 flex flex-col gap-0.5 text-left font-normal select-none"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-2.5 py-1 text-[11px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
        {columnTitle}
      </div>

      {canSort && (
        <>
          <button
            type="button"
            data-testid="ez-grid-column-menu-sort-asc"
            onClick={() => {
              onSortAsc();
              onClose();
            }}
            className={cn(
              'flex items-center gap-2 px-2.5 py-1.5 rounded-[6px] text-[12px] text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer w-full text-left',
              sortDirection === 'asc' && 'font-semibold text-brand-700 bg-brand-50'
            )}
          >
            <ArrowUp className="w-3.5 h-3.5 text-brand-600" />
            Ordenar Ascendente
          </button>
          <button
            type="button"
            data-testid="ez-grid-column-menu-sort-desc"
            onClick={() => {
              onSortDesc();
              onClose();
            }}
            className={cn(
              'flex items-center gap-2 px-2.5 py-1.5 rounded-[6px] text-[12px] text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer w-full text-left',
              sortDirection === 'desc' && 'font-semibold text-red-700 bg-red-50'
            )}
          >
            <ArrowDown className="w-3.5 h-3.5 text-red-600" />
            Ordenar Descendente
          </button>
        </>
      )}

      {canFilter && (
        <button
          type="button"
          data-testid="ez-grid-column-menu-filter"
          onClick={() => {
            onOpenFilter();
            onClose();
          }}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-[6px] text-[12px] text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer w-full text-left border-t border-gray-100"
        >
          <Filter className="w-3.5 h-3.5 text-gray-500" />
          Filtrar...
        </button>
      )}

      <button
        type="button"
        data-testid="ez-grid-column-menu-pin"
        onClick={() => {
          onTogglePin();
          onClose();
        }}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-[6px] text-[12px] text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer w-full text-left"
      >
        {isPinned ? (
          <>
            <PinOff className="w-3.5 h-3.5 text-gray-500" />
            Desafixar Coluna
          </>
        ) : (
          <>
            <Pin className="w-3.5 h-3.5 text-gray-500" />
            Fixar à Esquerda
          </>
        )}
      </button>

      <button
        type="button"
        data-testid="ez-grid-column-menu-group"
        onClick={() => {
          onToggleGroup();
          onClose();
        }}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-[6px] text-[12px] text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer w-full text-left"
      >
        <Rows className="w-3.5 h-3.5 text-gray-500" />
        {isGrouped ? 'Desagrupar' : 'Agrupar por este campo'}
      </button>
    </div>,
    document.body
  );
}

/* =========================================================================
   3. GRID CORNER MENU (Sankhya ag-grid-menu Parity)
   ========================================================================= */
interface EzGridCornerMenuProps {
  triggerElement: HTMLElement | null | undefined;
  density: 'compact' | 'comfortable';
  onToggleDensity: () => void;
  onClearAllFilters: () => void;
  onOpenColumnConfig: () => void;
  onOpenStatistics: () => void;
  columnsList: { id: string; label: string }[];
  onSelectColumn: (columnId: string) => void;
  onClose: () => void;
}

function EzGridCornerMenuPopover({
  triggerElement,
  density,
  onToggleDensity,
  onClearAllFilters,
  onOpenColumnConfig,
  onOpenStatistics,
  columnsList,
  onSelectColumn,
  onClose,
}: EzGridCornerMenuProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useLayoutEffect(() => {
    if (triggerElement) {
      const rect = triggerElement.getBoundingClientRect();
      const popoverWidth = 240;
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

  const filteredColumns = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase();
    return columnsList.filter((c) => c.label.toLowerCase().includes(term));
  }, [columnsList, searchTerm]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={popoverRef}
      role="menu"
      aria-label="Menu de opções da grade"
      data-testid="ez-grid-corner-menu"
      style={
        coords
          ? {
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
            }
          : { position: 'fixed', top: '100px', left: '100px' }
      }
      className="w-60 bg-white rounded-[10px] shadow-2xl border border-gray-200 z-[9999] p-2 flex flex-col gap-1 text-left font-normal select-none"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-2 py-1 text-[11px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100 flex items-center justify-between">
        <span>Opções da Grade</span>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 rounded p-0.5"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Localizar Coluna (Sankhya findcolumn.tpl.html parity) */}
      <div className="relative my-1">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Localizar coluna..."
          data-testid="ez-grid-corner-find-column-input"
          className="w-full text-[12px] px-2.5 py-1 pl-7 bg-gray-50 border border-gray-200 rounded-[6px] focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2 top-2 pointer-events-none" />
        {filteredColumns.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 max-h-32 overflow-y-auto bg-white border border-gray-200 rounded-[6px] shadow-lg z-50">
            {filteredColumns.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  onSelectColumn(c.id);
                  onClose();
                }}
                className="w-full text-left px-2.5 py-1.5 text-[12px] text-gray-700 hover:bg-gray-100 truncate cursor-pointer"
              >
                {c.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        data-testid="ez-grid-corner-toggle-density"
        onClick={() => {
          onToggleDensity();
          onClose();
        }}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-[6px] text-[12px] text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer w-full text-left"
      >
        <SlidersHorizontal className="w-3.5 h-3.5 text-gray-500" />
        {density === 'compact' ? 'Modo Confortável (40px)' : 'Modo Compacto (20px)'}
      </button>

      <button
        type="button"
        data-testid="ez-grid-corner-clear-filters"
        onClick={() => {
          onClearAllFilters();
          onClose();
        }}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-[6px] text-[12px] text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer w-full text-left"
      >
        <Filter className="w-3.5 h-3.5 text-gray-500" />
        Limpar Todos os Filtros
      </button>

      <button
        type="button"
        data-testid="ez-grid-corner-configure-columns"
        onClick={() => {
          onOpenColumnConfig();
          onClose();
        }}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-[6px] text-[12px] text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer w-full text-left"
      >
        <Eye className="w-3.5 h-3.5 text-gray-500" />
        Configurar Colunas...
      </button>

      <button
        type="button"
        data-testid="ez-grid-corner-statistics"
        onClick={() => {
          onOpenStatistics();
          onClose();
        }}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-[6px] text-[12px] text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer w-full text-left"
      >
        <BarChart3 className="w-3.5 h-3.5 text-gray-500" />
        Estatísticas da Grade...
      </button>
    </div>,
    document.body
  );
}

/* =========================================================================
   4. GRID STATISTICS MODAL (Sankhya GridStatistics Parity)
   ========================================================================= */
interface NumericStatistic {
  columnName: string;
  count: number;
  sum: number;
  avg: number;
  min: number;
  max: number;
}

interface EzGridStatisticsModalProps {
  statistics: NumericStatistic[];
  onClose: () => void;
}

function EzGridStatisticsModal({ statistics, onClose }: EzGridStatisticsModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  const formatNumber = (v: number) =>
    v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="Estatísticas da Grade"
        data-testid="ez-grid-statistics-modal"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-white rounded-[12px] shadow-2xl border border-gray-200 overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-brand-600" />
            <h3 className="text-[14px] font-semibold text-gray-800">Estatísticas da Grade</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar estatísticas"
            className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 max-h-[60vh] overflow-y-auto">
          {statistics.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-[13px]">
              Nenhuma coluna numérica disponível para cálculo de estatísticas.
            </div>
          ) : (
            <div className="border border-gray-200 rounded-[8px] overflow-hidden">
              <table className="w-full text-left text-[12px] border-collapse">
                <thead className="bg-gray-100 text-gray-700 font-semibold border-b border-gray-200">
                  <tr>
                    <th className="px-3.5 py-2">Coluna</th>
                    <th className="px-3 py-2 text-right">Ocorrências</th>
                    <th className="px-3 py-2 text-right">Soma</th>
                    <th className="px-3 py-2 text-right">Média</th>
                    <th className="px-3 py-2 text-right">Mínimo</th>
                    <th className="px-3 py-2 text-right">Máximo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {statistics.map((s) => (
                    <tr key={s.columnName} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3.5 py-2 font-medium text-gray-900">{s.columnName}</td>
                      <td className="px-3 py-2 text-right text-gray-600">{s.count}</td>
                      <td className="px-3 py-2 text-right font-medium text-gray-900">
                        {formatNumber(s.sum)}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-600">{formatNumber(s.avg)}</td>
                      <td className="px-3 py-2 text-right text-gray-600">{formatNumber(s.min)}</td>
                      <td className="px-3 py-2 text-right text-gray-600">{formatNumber(s.max)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end px-5 py-3 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-[12px] font-medium text-gray-700 bg-white border border-gray-300 rounded-[6px] hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* =========================================================================
   5. COLUMN CONFIGURATOR MODAL (Sankhya GridConfig Parity)
   ========================================================================= */
interface EzGridColumnConfigModalProps {
  columns: { id: string; label: string; isVisible: boolean }[];
  onToggleColumn: (columnId: string) => void;
  onRestoreDefaults: () => void;
  onClose: () => void;
}

function EzGridColumnConfigModal({
  columns,
  onToggleColumn,
  onRestoreDefaults,
  onClose,
}: EzGridColumnConfigModalProps) {
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const visibleColumns = useMemo(() => {
    if (!searchTerm.trim()) return columns;
    const term = searchTerm.toLowerCase();
    return columns.filter((c) => c.label.toLowerCase().includes(term));
  }, [columns, searchTerm]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="Configuração da Grade"
        data-testid="ez-grid-column-config-modal"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-[12px] shadow-2xl border border-gray-200 overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-brand-600" />
            <h3 className="text-[14px] font-semibold text-gray-800">Configuração de Colunas</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar configuração"
            className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-3">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar colunas..."
              data-testid="ez-grid-config-search-input"
              className="w-full text-[12px] px-3 py-1.5 pl-8 bg-gray-50 border border-gray-200 rounded-[6px] focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2 pointer-events-none" />
          </div>

          <div className="max-h-60 overflow-y-auto space-y-1 border border-gray-200 rounded-[8px] p-2 bg-gray-50/50">
            {visibleColumns.map((c) => (
              <label
                key={c.id}
                className="flex items-center justify-between px-2.5 py-1.5 bg-white rounded-[6px] border border-gray-100 hover:border-gray-200 cursor-pointer shadow-2xs"
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={c.isVisible}
                    onChange={() => onToggleColumn(c.id)}
                    data-testid={`ez-grid-config-toggle-${c.id}`}
                    className="w-3.5 h-3.5 rounded border-gray-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                  />
                  <span className="text-[12px] text-gray-800 font-medium">{c.label}</span>
                </div>
                {c.isVisible ? (
                  <Eye className="w-3.5 h-3.5 text-brand-600" />
                ) : (
                  <EyeOff className="w-3.5 h-3.5 text-gray-400" />
                )}
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            data-testid="ez-grid-config-restore-defaults"
            onClick={onRestoreDefaults}
            className="flex items-center gap-1.5 text-[12px] font-medium text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restaurar Padrão
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-[12px] font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-[6px] shadow-sm transition-colors cursor-pointer"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* =========================================================================
   6. MAIN COMPONENT (EzEntityGridInner)
   ========================================================================= */
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
    showGridCornerMenu = true,
    enableColumnMenu = true,
    zebraStriping = true,
    enableKeyboardNavigation = true,
    className,
    ...props
  }: EzEntityGridProps<T>,
  ref: Ref<HTMLDivElement>
) {
  const [currentDensity, setCurrentDensity] = useState<'compact' | 'comfortable'>(density);

  useEffect(() => {
    setCurrentDensity(density);
  }, [density]);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [localPinnedColumns, setLocalPinnedColumns] = useState<{ left: string[]; right: string[] }>({
    left: pinnedColumns?.left ?? [],
    right: pinnedColumns?.right ?? [],
  });

  useEffect(() => {
    setLocalPinnedColumns({
      left: pinnedColumns?.left ?? [],
      right: pinnedColumns?.right ?? [],
    });
  }, [pinnedColumns]);

  const [localGroupBy, setLocalGroupBy] = useState<string[]>(groupBy ?? []);
  useEffect(() => {
    setLocalGroupBy(groupBy ?? []);
  }, [groupBy]);

  const [activeFilterColumnId, setActiveFilterColumnId] = useState<string | null>(null);
  const [activeMenuColumnId, setActiveMenuColumnId] = useState<string | null>(null);
  const [isCornerMenuOpen, setIsCornerMenuOpen] = useState(false);
  const [isStatisticsModalOpen, setIsStatisticsModalOpen] = useState(false);
  const [isColumnConfigModalOpen, setIsColumnConfigModalOpen] = useState(false);
  const [focusedRowIndex, setFocusedRowIndex] = useState<number | null>(null);

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
    () => ({ left: localPinnedColumns.left, right: localPinnedColumns.right }),
    [localPinnedColumns]
  );

  const grouping = useMemo<GroupingState>(
    () => (localGroupBy && localGroupBy.length > 0 ? [localGroupBy[0]] : []),
    [localGroupBy]
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
      columnVisibility,
    },
    enableRowSelection: selectable,
    enableGrouping: grouping.length > 0,
    enableFilters: enableColumnFilters,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
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
    paginateExpandedRows: false,
  });

  const filterButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const columnMenuButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const cornerMenuButtonRef = useRef<HTMLButtonElement>(null);

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
    const selectedRows = table.getSelectedRowModel().rows.map((row) => row.original);
    onSelectionChange(selectedRows);
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

  // Overall statistics across the current filtered dataset for numeric columns
  const numericStatistics = useMemo<NumericStatistic[]>(() => {
    const rows = table.getFilteredRowModel().rows;
    if (rows.length === 0 || data.length === 0) return [];

    const stats: NumericStatistic[] = [];
    for (const col of table.getVisibleLeafColumns()) {
      if (col.id === 'select') continue;
      const values = rows
        .map((r) => r.getValue(col.id))
        .filter((v): v is number => typeof v === 'number' && !isNaN(v));

      if (values.length > 0) {
        const sum = values.reduce((a, b) => a + b, 0);
        const header = col.columnDef.header;
        const columnName = typeof header === 'string' ? header : col.id;
        stats.push({
          columnName,
          count: values.length,
          sum,
          avg: sum / values.length,
          min: Math.min(...values),
          max: Math.max(...values),
        });
      }
    }
    return stats;
  }, [table, data]);

  const formatFooterValue = (value: number) =>
    value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const orderedHeaders = useMemo(
    () => [
      ...table.getLeftHeaderGroups().flatMap((group) => group.headers),
      ...table.getCenterHeaderGroups().flatMap((group) => group.headers),
      ...table.getRightHeaderGroups().flatMap((group) => group.headers),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [table, columnPinning, resolvedColumns, columnVisibility]
  );

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

  const handleToggleColumnPin = (colId: string) => {
    setLocalPinnedColumns((prev) => {
      if (prev.left.includes(colId)) {
        return { ...prev, left: prev.left.filter((id) => id !== colId) };
      }
      return { ...prev, left: [...prev.left, colId] };
    });
  };

  const handleToggleColumnGroup = (colId: string) => {
    setLocalGroupBy((prev) => (prev.includes(colId) ? [] : [colId]));
  };

  const handleScrollToColumn = (colId: string) => {
    const el = headerCellRefs.current.get(colId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  };

  // Keyboard navigation handler
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTableSectionElement>) => {
    if (!enableKeyboardNavigation) return;
    const rows = table.getRowModel().rows;
    if (rows.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedRowIndex((prev) => (prev === null ? 0 : Math.min(prev + 1, rows.length - 1)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedRowIndex((prev) => (prev === null ? 0 : Math.max(prev - 1, 0)));
    } else if (e.key === ' ' && focusedRowIndex !== null && selectable) {
      e.preventDefault();
      const targetRow = rows[focusedRowIndex];
      if (targetRow) {
        targetRow.toggleSelected();
      }
    }
  };

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

      <div className="relative w-full">
        {/* AG Grid Corner Menu Button (Sankhya ag-grid-menu parity) */}
        {showGridCornerMenu && (
          <button
            ref={cornerMenuButtonRef}
            type="button"
            aria-label="Opções da grade"
            title="Opções da grade"
            data-testid="ez-grid-corner-menu-button"
            onClick={() => setIsCornerMenuOpen((prev) => !prev)}
            className="absolute top-1.5 right-1.5 z-20 p-1 rounded-[6px] bg-white/90 hover:bg-white text-gray-500 hover:text-gray-900 border border-gray-200 shadow-2xs hover:shadow-xs transition-all cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
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
                      'relative px-4 text-[13px] font-semibold text-gray-700 select-none bg-gray-80',
                      currentDensity === 'compact' ? 'py-1.5' : 'py-3',
                      !isLast && 'border-r border-gray-100',
                      canSort && 'cursor-pointer',
                      pinned && 'sticky z-10',
                      pinned === 'left' && 'shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)]',
                      pinned === 'right' && 'shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.15)]'
                    )}
                    onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                  >
                    {/* Sankhya AG Grid sort indicator borders (sk-col-orderned-asc / desc) */}
                    {sortDirection === 'asc' && (
                      <span
                        data-testid="sk-col-orderned-asc"
                        className="absolute top-0 left-0 right-0 h-[2px] bg-brand-500"
                      />
                    )}
                    {sortDirection === 'desc' && (
                      <span
                        data-testid="sk-col-orderned-desc"
                        className="absolute top-0 left-0 right-0 h-[2px] bg-red-500"
                      />
                    )}

                    <div className="flex items-center justify-between gap-1.5 w-full">
                      <span className="inline-flex items-center gap-1 truncate">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {canSort && (
                          <SortIcon
                            aria-hidden="true"
                            className={cn(
                              'w-3.5 h-3.5 shrink-0',
                              sortDirection === 'asc'
                                ? 'text-brand-600'
                                : sortDirection === 'desc'
                                  ? 'text-red-600'
                                  : 'text-gray-400'
                            )}
                          />
                        )}
                      </span>

                      <div className="flex items-center gap-0.5 shrink-0">
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
                              'p-1 rounded hover:bg-gray-200 transition-colors cursor-pointer',
                              isFiltered
                                ? 'text-brand-600 bg-brand-50 hover:bg-brand-100'
                                : 'text-gray-400 hover:text-gray-600'
                            )}
                          >
                            <Filter className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {enableColumnMenu && header.column.id !== 'select' && (
                          <button
                            ref={(el) => {
                              if (el) columnMenuButtonRefs.current.set(header.column.id, el);
                              else columnMenuButtonRefs.current.delete(header.column.id);
                            }}
                            type="button"
                            aria-hidden="true"
                            tabIndex={-1}
                            title={`Menu da coluna ${columnHeaderLabel}`}
                            data-testid={`ez-grid-column-menu-${header.column.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuColumnId(
                                activeMenuColumnId === header.column.id ? null : header.column.id
                              );
                            }}
                            className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody
            tabIndex={enableKeyboardNavigation ? 0 : undefined}
            onKeyDown={handleKeyDown}
            className="outline-none"
          >
            {table.getRowModel().rows.map((row, rowIndex) => {
              if (row.getIsGrouped()) {
                const toggleExpanded = row.getToggleExpandedHandler();
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
                      colSpan={orderedHeaders.length}
                      className={cn(
                        'px-4 text-[13px] font-semibold text-gray-900',
                        currentDensity === 'compact' ? 'py-1' : 'py-3'
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
              const isFocused = focusedRowIndex === rowIndex;
              const isEven = rowIndex % 2 === 1;

              return (
                <tr
                  key={row.id}
                  data-selected={isSelected || undefined}
                  onClick={() => setFocusedRowIndex(rowIndex)}
                  className={cn(
                    'border-t border-gray-200 group transition-colors',
                    isSelected
                      ? 'bg-brand-50'
                      : zebraStriping && isEven
                        ? 'bg-gray-50/60 hover:bg-grid-row-hover'
                        : 'bg-white hover:bg-grid-row-hover',
                    isFocused && 'outline-1 outline-brand-500 outline-offset-[-1px]'
                  )}
                >
                  {[
                    ...row.getLeftVisibleCells(),
                    ...row.getCenterVisibleCells(),
                    ...row.getRightVisibleCells(),
                  ].map((cell, cellIndex, allCells) => {
                    const pinned = cell.column.getIsPinned();
                    const isLastCell = cellIndex === allCells.length - 1;
                    return (
                      <td
                        key={cell.id}
                        data-pinned={pinned || undefined}
                        style={pinnedStyle(cell.column.id, pinned)}
                        className={cn(
                          'px-4 text-[13px] text-gray-900',
                          currentDensity === 'compact' ? 'py-1' : 'py-3',
                          !isLastCell && 'border-r border-gray-100',
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
                  colSpan={orderedHeaders.length}
                  className="px-4 py-6 text-center text-[13px] text-gray-500"
                >
                  Nenhum registro encontrado.
                </td>
              </tr>
            )}
          </tbody>
          {showFooter && (
            <tfoot>
              <tr
                data-testid="ez-entity-grid-footer-row"
                className="border-t-2 border-gray-200 bg-gray-80 font-semibold"
              >
                {orderedHeaders.map((header, headerIndex) => {
                  const columnId = header.column.id;
                  const value = footerValues[columnId];
                  const pinned = header.column.getIsPinned();
                  const isLastCell = headerIndex === orderedHeaders.length - 1;
                  return (
                    <td
                      key={columnId}
                      data-pinned={pinned || undefined}
                      style={pinnedStyle(columnId, pinned)}
                      className={cn(
                        'px-4 text-[13px] font-semibold text-gray-900',
                        currentDensity === 'compact' ? 'py-1' : 'py-3',
                        !isLastCell && 'border-r border-gray-100',
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
      </div>

      {/* Status Bar with Counts & Selection Metrics (Sankhya datagrid-footer-rows-counter) */}
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
                  {table.getSelectedRowModel().rows.length} selecionada
                  {table.getSelectedRowModel().rows.length !== 1 ? 's' : ''}
                </span>
              </>
            )}
            {numericStatistics.length > 0 && (
              <>
                <span className="text-gray-300">|</span>
                <button
                  type="button"
                  data-testid="ez-grid-open-statistics-button"
                  onClick={() => setIsStatisticsModalOpen(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-600 hover:text-brand-800 transition-colors cursor-pointer"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  Estatísticas
                </button>
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

      {/* Column Filter Popover */}
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

      {/* Column Menu Popover */}
      {activeMenuColumnId && (() => {
        const col = table.getColumn(activeMenuColumnId);
        if (!col) return null;
        const header = col.columnDef.header;
        const title = typeof header === 'string' ? header : (col.columnDef.id ?? col.id);
        const triggerEl = columnMenuButtonRefs.current.get(activeMenuColumnId);

        return (
          <EzColumnMenuPopover
            triggerElement={triggerEl}
            columnTitle={title}
            canSort={col.getCanSort()}
            sortDirection={col.getIsSorted()}
            canFilter={col.getCanFilter()}
            isPinned={col.getIsPinned()}
            isGrouped={localGroupBy.includes(col.id)}
            onSortAsc={() => col.toggleSorting(false)}
            onSortDesc={() => col.toggleSorting(true)}
            onOpenFilter={() => setActiveFilterColumnId(activeMenuColumnId)}
            onTogglePin={() => handleToggleColumnPin(col.id)}
            onToggleGroup={() => handleToggleColumnGroup(col.id)}
            onClose={() => setActiveMenuColumnId(null)}
          />
        );
      })()}

      {/* Corner Menu Popover */}
      {isCornerMenuOpen && (
        <EzGridCornerMenuPopover
          triggerElement={cornerMenuButtonRef.current}
          density={currentDensity}
          onToggleDensity={() =>
            setCurrentDensity((prev) => (prev === 'compact' ? 'comfortable' : 'compact'))
          }
          onClearAllFilters={() => table.resetColumnFilters()}
          onOpenColumnConfig={() => setIsColumnConfigModalOpen(true)}
          onOpenStatistics={() => setIsStatisticsModalOpen(true)}
          columnsList={table
            .getAllLeafColumns()
            .filter((c) => c.id !== 'select')
            .map((c) => ({
              id: c.id,
              label: typeof c.columnDef.header === 'string' ? c.columnDef.header : c.id,
            }))}
          onSelectColumn={handleScrollToColumn}
          onClose={() => setIsCornerMenuOpen(false)}
        />
      )}

      {/* Statistics Modal */}
      {isStatisticsModalOpen && (
        <EzGridStatisticsModal
          statistics={numericStatistics}
          onClose={() => setIsStatisticsModalOpen(false)}
        />
      )}

      {/* Column Config Modal */}
      {isColumnConfigModalOpen && (
        <EzGridColumnConfigModal
          columns={table
            .getAllLeafColumns()
            .filter((c) => c.id !== 'select')
            .map((c) => ({
              id: c.id,
              label: typeof c.columnDef.header === 'string' ? c.columnDef.header : c.id,
              isVisible: c.getIsVisible(),
            }))}
          onToggleColumn={(colId) => {
            const col = table.getColumn(colId);
            if (col) col.toggleVisibility();
          }}
          onRestoreDefaults={() => table.resetColumnVisibility()}
          onClose={() => setIsColumnConfigModalOpen(false)}
        />
      )}

      {/* Rich Pagination Controls */}
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
 * sortable columns, optional multi-row selection, rich pagination, Excel-style
 * distinct-value filters with tabs, persistent AG Grid scrollbar, status bar,
 * AG Grid corner menu, grid statistics, and column configurator.
 */
export const EzEntityGrid = forwardRef(EzEntityGridInner) as EzEntityGridComponent;
(EzEntityGrid as unknown as { displayName?: string }).displayName = 'EzEntityGrid';
