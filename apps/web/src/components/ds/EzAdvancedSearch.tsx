import {
  HTMLAttributes,
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { cn } from './utils';
import { EzSpinner } from './EzSpinner';
import { EzEmptyCard } from './EzEmptyCard';
import { LayoutGrid, List as ListIcon, Network, Search as SearchIcon } from 'lucide-react';

/**
 * A single row returned by `searchLoader`, rendered in list/grid mode.
 */
export type SearchResultItem = {
  /** Unique identifier of the record. */
  id: string | number;
  /** Primary label shown for the result. */
  title: string;
  /** Optional secondary text shown below the title. */
  subtitle?: string;
  /** Any extra data the caller wants to carry alongside the result. */
  [key: string]: unknown;
};

/**
 * A node returned by the optional `treeLoader`, rendered in tree view mode.
 */
export type SearchTreeNode = {
  /** Unique identifier of the node. */
  id: string | number;
  /** Label displayed for the node. */
  label: string;
  /** Nested child nodes, if any. */
  children?: SearchTreeNode[];
  /** Any extra data the caller wants to carry alongside the node. */
  [key: string]: unknown;
};

export type EzAdvancedSearchViewMode = 'list' | 'grid' | 'tree';

export type EzAdvancedSearchProps = Omit<HTMLAttributes<HTMLDivElement>, 'onSelect'> & {
  /**
   * Async function responsible for loading the search results for the given
   * text. Provided entirely by the consumer — no PesquisaFetcher/DataUnit
   * from Sankhya is involved.
   */
  searchLoader: (text: string) => Promise<SearchResultItem[]>;
  /**
   * Called with the selected result item (list/grid) or tree node (tree mode).
   */
  onSelect: (item: SearchResultItem | SearchTreeNode) => void;
  /**
   * Initial / controlled result display mode.
   * @default 'list'
   */
  viewMode?: 'list' | 'grid';
  /**
   * Optional async function to load hierarchical (tree) results. When
   * provided, a "tree" view mode toggle becomes available.
   */
  treeLoader?: (text: string) => Promise<SearchTreeNode[]>;
  /**
   * Placeholder text for the search field.
   * @default 'Buscar...'
   */
  placeholder?: string;
  /**
   * Debounce delay (ms) applied before calling `searchLoader`/`treeLoader`.
   * @default 0
   */
  debounceMs?: number;
};

function flattenVisibleTreeNodes(
  nodes: SearchTreeNode[],
  expanded: Set<string | number>,
  level = 0
): { node: SearchTreeNode; level: number }[] {
  const result: { node: SearchTreeNode; level: number }[] = [];
  for (const node of nodes) {
    result.push({ node, level });
    if (node.children && node.children.length > 0 && expanded.has(node.id)) {
      result.push(...flattenVisibleTreeNodes(node.children, expanded, level + 1));
    }
  }
  return result;
}

/**
 * Aponta DS Advanced Search (mirrors Sankhya DS `snk-pesquisa`)
 * Advanced search panel with a text field and multiple result display
 * modes (list, grid and an optional hierarchical tree). Data loading is
 * fully delegated to consumer-provided async functions (`searchLoader`,
 * optional `treeLoader`) — no Sankhya `PesquisaFetcher`/`DataUnit` involved.
 */
export const EzAdvancedSearch = forwardRef<HTMLDivElement, EzAdvancedSearchProps>(
  (
    {
      searchLoader,
      onSelect,
      viewMode: viewModeProp,
      treeLoader,
      placeholder = 'Buscar...',
      debounceMs = 0,
      className,
      ...props
    },
    ref
  ) => {
    const [text, setText] = useState('');
    const [viewMode, setViewMode] = useState<EzAdvancedSearchViewMode>(viewModeProp ?? 'list');
    const [results, setResults] = useState<SearchResultItem[]>([]);
    const [treeNodes, setTreeNodes] = useState<SearchTreeNode[]>([]);
    const [expanded, setExpanded] = useState<Set<string | number>>(new Set());
    const [selectedId, setSelectedId] = useState<string | number | undefined>(undefined);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const requestIdRef = useRef(0);

    useEffect(() => {
      if (viewModeProp) {
        setViewMode(viewModeProp);
      }
    }, [viewModeProp]);

    const runSearch = useCallback(
      (value: string) => {
        const requestId = ++requestIdRef.current;
        setLoading(true);
        setHasSearched(true);

        const loader = viewMode === 'tree' && treeLoader ? treeLoader : searchLoader;
        Promise.resolve(loader(value))
          .then((data) => {
            if (requestIdRef.current !== requestId) return;
            if (viewMode === 'tree' && treeLoader) {
              setTreeNodes(data as unknown as SearchTreeNode[]);
              setResults([]);
            } else {
              setResults(data as SearchResultItem[]);
              setTreeNodes([]);
            }
          })
          .finally(() => {
            if (requestIdRef.current === requestId) {
              setLoading(false);
            }
          });
      },
      [searchLoader, treeLoader, viewMode]
    );

    const handleTextChange = (value: string) => {
      setText(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (debounceMs > 0) {
        debounceRef.current = setTimeout(() => runSearch(value), debounceMs);
      } else {
        runSearch(value);
      }
    };

    useEffect(() => {
      return () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
      };
    }, []);

    const handleSelectResult = (item: SearchResultItem) => {
      setSelectedId(item.id);
      onSelect(item);
    };

    const handleSelectTreeNode = (node: SearchTreeNode) => {
      setSelectedId(node.id);
      onSelect(node);
    };

    const toggleExpand = (id: string | number) => {
      setExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    };

    const switchViewMode = (mode: EzAdvancedSearchViewMode) => {
      setViewMode(mode);
      if (hasSearched) {
        // Re-run the search against the newly selected mode's loader.
        requestIdRef.current += 1;
        setTimeout(() => runSearch(text), 0);
      }
    };

    const visibleTreeRows = flattenVisibleTreeNodes(treeNodes, expanded);
    const isEmpty =
      !loading &&
      hasSearched &&
      (viewMode === 'tree' ? visibleTreeRows.length === 0 : results.length === 0);

    return (
      <div
        ref={ref}
        className={cn('flex flex-col w-full gap-3 rounded-[12px] border border-gray-200 bg-white p-4', className)}
        {...props}
      >
        <div className="flex items-stretch gap-2 w-full">
          <div
            className={cn(
              'relative flex items-center flex-1 overflow-hidden transition-colors border',
              'rounded-[12px] bg-white h-[42px] border-gray-200',
              'focus-within:border-brand-600 focus-within:ring-1 focus-within:ring-brand-600 hover:border-gray-300'
            )}
          >
            <div className="flex items-center justify-center shrink-0 pl-3 pr-2 text-gray-500">
              <SearchIcon className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={text}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder={placeholder}
              className="flex-1 w-full bg-transparent border-none outline-none text-[14px] text-gray-900 placeholder:text-gray-400 h-full pr-3"
            />
          </div>

          <div className="flex items-center gap-1 shrink-0 rounded-[12px] border border-gray-200 p-1">
            <button
              type="button"
              aria-label="Exibir em lista"
              aria-pressed={viewMode === 'list'}
              onClick={() => switchViewMode('list')}
              className={cn(
                'flex items-center justify-center w-8 h-8 rounded-[8px] transition-colors',
                viewMode === 'list' ? 'bg-brand-50 text-brand-700' : 'text-gray-500 hover:bg-gray-90'
              )}
            >
              <ListIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              aria-label="Exibir em grade"
              aria-pressed={viewMode === 'grid'}
              onClick={() => switchViewMode('grid')}
              className={cn(
                'flex items-center justify-center w-8 h-8 rounded-[8px] transition-colors',
                viewMode === 'grid' ? 'bg-brand-50 text-brand-700' : 'text-gray-500 hover:bg-gray-90'
              )}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            {treeLoader && (
              <button
                type="button"
                aria-label="Exibir em árvore"
                aria-pressed={viewMode === 'tree'}
                onClick={() => switchViewMode('tree')}
                className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-[8px] transition-colors',
                  viewMode === 'tree' ? 'bg-brand-50 text-brand-700' : 'text-gray-500 hover:bg-gray-90'
                )}
              >
                <Network className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div
          data-testid="ez-advanced-search-results"
          data-view-mode={viewMode}
          className="flex flex-col w-full min-h-[80px]"
        >
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <EzSpinner label="Buscando..." />
            </div>
          ) : isEmpty ? (
            <EzEmptyCard title="Nenhum resultado encontrado" description="Tente ajustar os termos da pesquisa." />
          ) : viewMode === 'tree' ? (
            <div role="tree" className="flex flex-col w-full gap-0.5">
              {visibleTreeRows.map(({ node, level }) => {
                const hasChildren = !!node.children && node.children.length > 0;
                const isOpen = expanded.has(node.id);
                const isSelected = selectedId === node.id;
                return (
                  <div
                    key={node.id}
                    role="treeitem"
                    aria-selected={isSelected}
                    aria-expanded={hasChildren ? isOpen : undefined}
                    data-testid={`ez-advanced-search-tree-node-${node.id}`}
                    onClick={() => handleSelectTreeNode(node)}
                    style={{ paddingLeft: `${level * 20 + 8}px` }}
                    className={cn(
                      'flex items-center gap-2 py-1.5 pr-2 rounded-[8px] cursor-pointer text-[14px] transition-colors select-none',
                      isSelected ? 'bg-brand-50 text-brand-700 font-medium' : 'text-gray-900 hover:bg-gray-90'
                    )}
                  >
                    {hasChildren && (
                      <button
                        type="button"
                        aria-label={isOpen ? 'Recolher' : 'Expandir'}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(node.id);
                        }}
                        className="flex items-center justify-center w-4 h-4 shrink-0 text-gray-500"
                      >
                        {isOpen ? '−' : '+'}
                      </button>
                    )}
                    <span className="truncate">{node.label}</span>
                  </div>
                );
              })}
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {results.map((item) => {
                const isSelected = selectedId === item.id;
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => handleSelectResult(item)}
                    className={cn(
                      'flex flex-col items-start gap-1 rounded-[12px] border p-3 text-left transition-colors outline-none',
                      'focus-visible:ring-2 focus-visible:ring-brand-200',
                      isSelected
                        ? 'bg-brand-50 border-brand-500 text-brand-700'
                        : 'bg-white border-gray-200 hover:bg-gray-80 hover:border-gray-300 text-gray-900'
                    )}
                  >
                    <span className="text-[14px] font-medium truncate w-full">{item.title}</span>
                    {item.subtitle && (
                      <span className="text-[12px] text-gray-500 truncate w-full">{item.subtitle}</span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col w-full divide-y divide-gray-100">
              {results.map((item) => {
                const isSelected = selectedId === item.id;
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => handleSelectResult(item)}
                    className={cn(
                      'flex flex-col items-start gap-0.5 w-full px-3 py-2.5 text-left transition-colors outline-none',
                      'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-200',
                      isSelected ? 'bg-brand-50' : 'hover:bg-gray-90'
                    )}
                  >
                    <span className={cn('text-[14px] font-medium truncate w-full', isSelected ? 'text-brand-700' : 'text-gray-900')}>
                      {item.title}
                    </span>
                    {item.subtitle && (
                      <span className="text-[12px] text-gray-500 truncate w-full">{item.subtitle}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }
);

EzAdvancedSearch.displayName = 'EzAdvancedSearch';
