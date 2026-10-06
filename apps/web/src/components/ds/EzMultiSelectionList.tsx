import { HTMLAttributes, forwardRef } from 'react';
import { cn } from './utils';
import { Check } from 'lucide-react';

export interface EzMultiSelectionListItem {
  id: string;
  label: string;
}

export interface EzMultiSelectionListProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /**
   * Items available for selection.
   */
  items: EzMultiSelectionListItem[];
  /**
   * Currently selected item ids.
   */
  selectedIds: string[];
  /**
   * Called with the full updated array of selected ids whenever an item is toggled.
   */
  onChange: (selectedIds: string[]) => void;
}

/**
 * Aponta DS Multi Selection List
 * A plain list of checkbox rows for selecting multiple items (unlike
 * `EzMultiSelect` which is a combobox/tag input).
 */
export const EzMultiSelectionList = forwardRef<HTMLDivElement, EzMultiSelectionListProps>(
  ({ items, selectedIds, onChange, className, ...props }, ref) => {
    const toggle = (id: string) => {
      if (selectedIds.includes(id)) {
        onChange(selectedIds.filter((v) => v !== id));
      } else {
        onChange([...selectedIds, id]);
      }
    };

    return (
      <div
        ref={ref}
        role="listbox"
        aria-multiselectable="true"
        className={cn('flex flex-col w-full bg-white rounded-[12px] border border-gray-200 divide-y divide-gray-100', className)}
        {...props}
      >
        {items.map((item) => {
          const isSelected = selectedIds.includes(item.id);
          return (
            <label
              key={item.id}
              role="option"
              aria-selected={isSelected}
              className={cn(
                'flex items-center gap-3 px-4 py-3 cursor-pointer select-none transition-colors',
                isSelected ? 'bg-brand-50' : 'hover:bg-gray-90'
              )}
            >
              <div className="relative flex items-center justify-center shrink-0">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggle(item.id)}
                  className={cn(
                    'peer appearance-none w-5 h-5 border-2 rounded transition-colors',
                    'checked:bg-brand-600 checked:border-brand-600 focus-visible:ring-2 focus-visible:ring-brand-200 focus:outline-none',
                    'border-gray-300 hover:border-gray-400'
                  )}
                />
                <Check className="absolute w-3.5 h-3.5 pointer-events-none opacity-0 peer-checked:opacity-100 text-white stroke-[3]" />
              </div>
              <span className="text-[14px] font-medium text-gray-900 truncate">{item.label}</span>
            </label>
          );
        })}
      </div>
    );
  }
);

EzMultiSelectionList.displayName = 'EzMultiSelectionList';
