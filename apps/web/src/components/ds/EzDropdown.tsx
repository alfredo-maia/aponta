import { ButtonHTMLAttributes, forwardRef, ReactNode, useEffect, useRef, useState } from 'react';
import { cn } from './utils';

export interface EzDropdownOptions {
  label: ReactNode;
  icon?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
}

export interface EzDropdownProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'title'> {
  /**
   * The trigger button content.
   */
  trigger: ReactNode;
  options: EzDropdownOptions[];
  /**
   * Alignment of the dropdown menu relative to the trigger.
   * @default 'left'
   */
  align?: 'left' | 'right';
}

/**
 * Aponta DS Dropdown
 * Lightweight native dropdown menu without Heavy UI libraries.
 */
export const EzDropdown = forwardRef<HTMLButtonElement, EzDropdownProps>(
  ({ trigger, options, align = 'left', className, disabled, ...props }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handleOutsideClick = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setIsOpen(false);
        }
      };
      document.addEventListener('mousedown', handleOutsideClick);
      return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, []);

    return (
      <div className="relative inline-block text-left" ref={containerRef}>
        <button
          ref={ref}
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'inline-flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 rounded-[12px]',
            disabled && 'opacity-50 cursor-not-allowed',
            className
          )}
          {...props}
        >
          {trigger}
        </button>

        {isOpen && !disabled && (
          <div
            className={cn(
              'absolute z-50 mt-2 w-56 rounded-[12px] bg-white shadow-lg border border-gray-100 py-1 focus:outline-none animate-in fade-in zoom-in-95 duration-100',
              align === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left'
            )}
            role="menu"
          >
            {options.map((opt, idx) => (
              <button
                key={idx}
                disabled={opt.disabled}
                onClick={() => {
                  opt.onClick?.();
                  setIsOpen(false);
                }}
                className={cn(
                  'flex w-full items-center px-4 py-2 text-[14px] font-medium transition-colors',
                  opt.disabled
                    ? 'text-gray-300 cursor-not-allowed'
                    : opt.danger
                    ? 'text-red-700 hover:bg-red-50'
                    : 'text-gray-700 hover:bg-gray-80 hover:text-gray-900'
                )}
                role="menuitem"
              >
                {opt.icon && <span className="mr-2 w-4 h-4 shrink-0 flex items-center justify-center">{opt.icon}</span>}
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }
);

EzDropdown.displayName = 'EzDropdown';
