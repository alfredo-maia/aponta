import { InputHTMLAttributes, forwardRef, useEffect, useRef, useState } from 'react';
import { cn } from './utils';
import { AlertCircle, Check, ChevronDown, Search, X } from 'lucide-react';

export interface EzSearchOption {
  label: string;
  value: string | number;
}

export interface EzSearchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'size'> {
  label?: string;
  message?: string;
  hasError?: boolean;
  value?: string | number | null;
  onChange?: (value: string | number | null) => void;
  options?: EzSearchOption[];
  onSearchChange?: (term: string) => void;
  placeholder?: string;
}

/**
 * Aponta DS Search (Autocomplete / Combobox)
 * An input that allows searching and selecting an item from a dropdown list.
 */
export const EzSearch = forwardRef<HTMLInputElement, EzSearchProps>(
  (
    {
      label,
      message,
      hasError = false,
      value = null,
      onChange,
      options = [],
      onSearchChange,
      disabled,
      className,
      placeholder = 'Selecione ou busque...',
      id,
      required,
      ...props
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    // Sync selected value with search term display when closed
    const selectedOption = options.find((opt) => String(opt.value) === String(value));
    
    useEffect(() => {
      if (!isOpen) {
        setSearchTerm(selectedOption ? selectedOption.label : '');
      }
    }, [isOpen, selectedOption]);

    // Handle outside clicks to close the dropdown
    useEffect(() => {
      const handleOutsideClick = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setIsOpen(false);
        }
      };
      document.addEventListener('mousedown', handleOutsideClick);
      return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const text = e.target.value;
      setSearchTerm(text);
      setIsOpen(true);
      if (onSearchChange) {
        onSearchChange(text);
      }
    };

    const handleSelectOption = (option: EzSearchOption) => {
      onChange?.(option.value);
      setSearchTerm(option.label);
      setIsOpen(false);
    };

    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange?.(null);
      setSearchTerm('');
      if (onSearchChange) onSearchChange('');
    };

    // Filter options locally if no external search handler is provided
    const visibleOptions = onSearchChange
      ? options
      : options.filter((opt) =>
          opt.label.toLowerCase().includes(searchTerm.toLowerCase())
        );

    const wrapperClasses = cn(
      'relative flex items-center w-full overflow-hidden transition-colors border',
      'rounded-[12px] bg-white group h-[42px]',
      isOpen || hasError ? 'border-ocean-600 ring-1 ring-ocean-600' : 'border-gray-200 hover:border-gray-300',
      hasError && !isOpen && 'border-red-600 ring-red-600',
      disabled && 'bg-gray-80 border-gray-100 cursor-not-allowed'
    );

    return (
      <div className={cn('flex flex-col w-full gap-1.5 relative', className)} ref={containerRef}>
        {label && (
          <label
            htmlFor={id}
            className={cn(
              'text-[14px] font-medium leading-none mb-0.5 select-none',
              disabled ? 'text-gray-400' : 'text-gray-900',
              hasError && 'text-red-700'
            )}
          >
            {label}
            {required && <span className="ml-1 text-red-600">*</span>}
          </label>
        )}

        <div
          className={wrapperClasses}
          onClick={() => {
            if (!disabled) setIsOpen(true);
          }}
        >
          <div className="flex items-center justify-center shrink-0 pl-3 pr-2 text-gray-500">
            <Search className="w-4 h-4" />
          </div>

          <input
            ref={ref}
            id={id}
            type="text"
            disabled={disabled}
            value={searchTerm}
            onChange={handleInputChange}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            className={cn(
              'flex-1 w-full bg-transparent border-none outline-none text-[14px] text-gray-900 placeholder:text-gray-400 h-full',
              disabled && 'text-gray-400 cursor-not-allowed'
            )}
            autoComplete="off"
            {...props}
          />

          <div className="flex items-center justify-center shrink-0 pr-2 pl-1 text-gray-500 gap-1 opacity-70">
            {value != null && !disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                title="Limpar seleção"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <ChevronDown className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
          </div>
        </div>

        {/* Dropdown Options */}
        {isOpen && (
          <div className="absolute top-[calc(100%-4px)] left-0 w-full z-50 mt-1 max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-[8px] shadow-lg py-1">
            {visibleOptions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                Nenhum resultado encontrado
              </div>
            ) : (
              visibleOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <div
                    key={opt.value}
                    onClick={() => handleSelectOption(opt)}
                    className={cn(
                      'flex items-center justify-between px-3 py-2 text-sm cursor-pointer mx-1 rounded-[4px] transition-colors',
                      isSelected ? 'bg-ocean-50 text-ocean-700 font-medium' : 'text-gray-900 hover:bg-gray-90'
                    )}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && <Check className="w-4 h-4 text-ocean-600 shrink-0 ml-2" />}
                  </div>
                );
              })
            )}
          </div>
        )}

        {message && (
          <div
            className={cn(
              'flex items-center gap-1.5 text-[12px] font-medium leading-none mt-0.5',
              hasError ? 'text-red-700' : 'text-gray-500',
              disabled && 'text-gray-400'
            )}
          >
            {hasError && <AlertCircle className="w-3.5 h-3.5" />}
            <span>{message}</span>
          </div>
        )}
      </div>
    );
  }
);

EzSearch.displayName = 'EzSearch';
