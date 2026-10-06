import { ButtonHTMLAttributes, forwardRef, useEffect, useRef, useState } from 'react';
import { cn } from './utils';
import { ChevronDown } from 'lucide-react';

export interface EzSplitButtonAction {
  label: string;
  onClick: () => void;
}

export interface EzSplitButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  /**
   * Label of the main (primary) action button.
   */
  label: string;
  /**
   * Called when the main button is clicked.
   */
  onClick?: () => void;
  /**
   * Secondary actions displayed in the dropdown opened by the chevron button.
   */
  actions: EzSplitButtonAction[];
}

/**
 * Aponta DS Split Button (inspired by @sankhyalabs/ezui)
 * A primary action button glued to a chevron button that opens a dropdown
 * of secondary actions.
 */
export const EzSplitButton = forwardRef<HTMLButtonElement, EzSplitButtonProps>(
  ({ label, onClick, actions, className, disabled, ...props }, ref) => {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handleOutsideClick = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setOpen(false);
        }
      };
      document.addEventListener('mousedown', handleOutsideClick);
      return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, []);

    return (
      <div ref={containerRef} className={cn('relative inline-flex', className)}>
        <div className="inline-flex rounded-[24px] overflow-hidden border border-brand-500">
          <button
            ref={ref}
            type="button"
            disabled={disabled}
            onClick={onClick}
            className={cn(
              'flex items-center justify-center h-[42px] px-4 text-sm font-medium whitespace-nowrap',
              'bg-brand-500 text-gray-70 hover:bg-brand-700 transition-colors outline-none',
              'disabled:bg-gray-400 disabled:text-gray-70 disabled:cursor-not-allowed'
            )}
            {...props}
          >
            {label}
          </button>
          <button
            type="button"
            disabled={disabled}
            aria-label="Mais ações"
            aria-haspopup="menu"
            aria-expanded={open}
            onClick={() => setOpen((prev) => !prev)}
            className={cn(
              'flex items-center justify-center h-[42px] w-[36px] border-l border-brand-700/40',
              'bg-brand-500 text-gray-70 hover:bg-brand-700 transition-colors outline-none',
              'disabled:bg-gray-400 disabled:cursor-not-allowed'
            )}
          >
            <ChevronDown className={cn('w-4 h-4 transition-transform', open && 'rotate-180')} />
          </button>
        </div>

        {open && (
          <div
            role="menu"
            className="absolute top-[calc(100%+4px)] right-0 min-w-[160px] z-50 bg-white border border-gray-200 rounded-[8px] shadow-lg py-1"
          >
            {actions.map((action, index) => (
              <button
                key={`${action.label}-${index}`}
                role="menuitem"
                type="button"
                onClick={() => {
                  action.onClick();
                  setOpen(false);
                }}
                className="flex w-full items-center px-3 py-2 text-sm text-gray-900 hover:bg-gray-90 transition-colors text-left"
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }
);

EzSplitButton.displayName = 'EzSplitButton';
