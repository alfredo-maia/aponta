import { HTMLAttributes, forwardRef, useState } from 'react';
import { cn } from './utils';
import { Search } from 'lucide-react';
import { EzCheck } from './EzCheck';

/**
 * A single checkable row rendered by `EzEntityList`.
 */
export type EzEntityListItem = {
  id: string;
  label: string;
  checked: boolean;
};

export type EzEntityListProps = Omit<HTMLAttributes<HTMLDivElement>, 'onChange' | 'onToggle'> & {
  /**
   * Items rendered as checkbox rows.
   */
  items: EzEntityListItem[];
  /**
   * Called with the id of the item whose checkbox was toggled.
   */
  onToggle: (id: string) => void;
  /**
   * Called with the current search text. Use this for async search (e.g.
   * fetching and appending new items to `items`). When omitted, the list is
   * filtered locally by `label` instead.
   */
  onSearch?: (text: string) => void;
  /**
   * Placeholder text for the search field.
   * @default 'Buscar...'
   */
  searchPlaceholder?: string;
  /**
   * Maximum height for the scrollable list area, adding a scrollbar once reached.
   */
  maxHeightList?: string;
};

/**
 * Aponta DS Entity List
 * Mirrors Sankhya DS `snk-entity-list`: a search field on top that either
 * triggers an async search (`onSearch`, used to append new items fetched
 * elsewhere) or filters the list locally by label, paired with a list of
 * checkbox rows below. Reuses `EzCheck` for each row.
 */
export const EzEntityList = forwardRef<HTMLDivElement, EzEntityListProps>(
  (
    {
      items,
      onToggle,
      onSearch,
      searchPlaceholder = 'Buscar...',
      maxHeightList,
      className,
      ...props
    },
    ref
  ) => {
    const [searchTerm, setSearchTerm] = useState('');

    const handleSearchChange = (text: string) => {
      setSearchTerm(text);
      onSearch?.(text);
    };

    const visibleItems = onSearch
      ? items
      : items.filter((item) =>
          item.label.toLowerCase().includes(searchTerm.toLowerCase())
        );

    return (
      <div ref={ref} className={cn('flex flex-col w-full gap-3', className)} {...props}>
        <div
          className={cn(
            'relative flex items-center w-full overflow-hidden transition-colors border',
            'rounded-[12px] bg-white h-[42px]',
            'focus-within:border-brand-600 focus-within:ring-1 focus-within:ring-brand-600',
            'border-gray-200 hover:border-gray-300'
          )}
        >
          <div className="flex items-center justify-center shrink-0 pl-3 pr-2 text-gray-500">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="flex-1 w-full bg-transparent border-none outline-none text-[14px] text-gray-900 placeholder:text-gray-400 h-full pr-3"
          />
        </div>

        <div
          className="flex flex-col w-full bg-white rounded-[12px] border border-gray-200 divide-y divide-gray-100 overflow-y-auto"
          style={maxHeightList ? { maxHeight: maxHeightList } : undefined}
        >
          {visibleItems.length === 0 ? (
            <div className="px-4 py-3 text-[13px] text-gray-500 text-center">
              Nenhum item encontrado
            </div>
          ) : (
            visibleItems.map((item) => (
              <div
                key={item.id}
                className={cn(
                  'flex items-center px-4 py-3 transition-colors',
                  item.checked ? 'bg-brand-50' : 'hover:bg-gray-90'
                )}
              >
                <EzCheck
                  id={`ez-entity-list-item-${item.id}`}
                  label={item.label}
                  checked={item.checked}
                  onChange={() => onToggle(item.id)}
                />
              </div>
            ))
          )}
        </div>
      </div>
    );
  }
);

EzEntityList.displayName = 'EzEntityList';
