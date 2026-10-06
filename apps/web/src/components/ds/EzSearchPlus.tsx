import { InputHTMLAttributes, ReactNode, forwardRef } from 'react';
import { cn } from './utils';
import { Filter, Search } from 'lucide-react';

export interface EzSearchPlusProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'size'> {
  /**
   * Current text value of the search field.
   */
  value: string;
  /**
   * Called whenever the search text changes.
   */
  onChange: (value: string) => void;
  /**
   * Called when the "Filtros" button is clicked, to open/close the advanced filters panel.
   */
  onToggleFilters: () => void;
  /**
   * Whether the filters panel is currently open / has active filters applied.
   * @default false
   */
  filtersActive?: boolean;
  /**
   * Optional content rendered below the search bar when `filtersActive` is true
   * (e.g. the advanced filters form).
   */
  filtersPanel?: ReactNode;
  /**
   * Optional label displayed above the search bar.
   */
  label?: string;
}

/**
 * Aponta DS Search Plus (inspired by @sankhyalabs/ezui)
 * A search input paired with a "Filtros" toggle button that reveals an
 * embedded advanced filters panel.
 */
export const EzSearchPlus = forwardRef<HTMLInputElement, EzSearchPlusProps>(
  (
    {
      value,
      onChange,
      onToggleFilters,
      filtersActive = false,
      filtersPanel,
      label,
      placeholder = 'Buscar...',
      className,
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    return (
      <div className={cn('flex flex-col w-full gap-1.5', className)}>
        {label && (
          <label
            htmlFor={id}
            className={cn(
              'text-[14px] font-medium leading-none mb-0.5 select-none',
              disabled ? 'text-gray-400' : 'text-gray-900'
            )}
          >
            {label}
          </label>
        )}

        <div className="flex items-stretch gap-2 w-full">
          <div
            className={cn(
              'relative flex items-center flex-1 overflow-hidden transition-colors border',
              'rounded-[12px] bg-white h-[42px]',
              'focus-within:border-brand-600 focus-within:ring-1 focus-within:ring-brand-600',
              'border-gray-200 hover:border-gray-300',
              disabled && 'bg-gray-80 border-gray-100 cursor-not-allowed'
            )}
          >
            <div className="flex items-center justify-center shrink-0 pl-3 pr-2 text-gray-500">
              <Search className="w-4 h-4" />
            </div>

            <input
              ref={ref}
              id={id}
              type="text"
              disabled={disabled}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              className={cn(
                'flex-1 w-full bg-transparent border-none outline-none text-[14px] text-gray-900 placeholder:text-gray-400 h-full pr-3',
                disabled && 'text-gray-400 cursor-not-allowed'
              )}
              {...props}
            />
          </div>

          <button
            type="button"
            onClick={onToggleFilters}
            disabled={disabled}
            aria-pressed={filtersActive}
            className={cn(
              'flex items-center gap-1.5 shrink-0 h-[42px] px-4 rounded-[12px] border text-[14px] font-medium transition-colors outline-none',
              'focus-visible:ring-4 focus-visible:ring-brand-200',
              filtersActive
                ? 'bg-brand-50 border-brand-500 text-brand-700'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-80 hover:border-gray-300',
              disabled && 'bg-gray-80 border-gray-100 text-gray-400 cursor-not-allowed'
            )}
          >
            <Filter className="w-4 h-4" />
            Filtros
          </button>
        </div>

        {filtersActive && filtersPanel && (
          <div className="w-full border border-gray-200 rounded-[12px] bg-white p-4 shadow-sm">
            {filtersPanel}
          </div>
        )}
      </div>
    );
  }
);

EzSearchPlus.displayName = 'EzSearchPlus';
