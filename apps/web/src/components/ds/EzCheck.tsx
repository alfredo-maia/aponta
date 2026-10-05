import { InputHTMLAttributes, forwardRef, ReactNode } from 'react';
import { cn } from './utils';

export interface EzCheckProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  /**
   * Label directly next to the checkbox.
   */
  label?: string | ReactNode;
  /**
   * Has an error state.
   */
  hasError?: boolean;
  /**
   * Extra classes applied to the label <span> (e.g. 'line-through' for
   * completed checklist items).
   */
  labelClassName?: string;
}

/**
 * Aponta DS Checkbox
 */
export const EzCheck = forwardRef<HTMLInputElement, EzCheckProps>(
  ({ label, hasError, labelClassName, className, disabled, id, ...props }, ref) => {
    return (
      <label
        className={cn(
          'inline-flex items-center gap-2 group cursor-pointer select-none',
          disabled && 'cursor-not-allowed opacity-60',
          className
        )}
        htmlFor={id}
      >
        <div className="relative flex items-center justify-center">
          <input
            {...props}
            type="checkbox"
            id={id}
            ref={ref}
            disabled={disabled}
            className={cn(
              'peer appearance-none w-5 h-5 border-2 rounded transition-colors',
              'checked:bg-brand-600 checked:border-brand-600 focus-visible:ring-2 focus-visible:ring-brand-200 focus:outline-none',
              hasError ? 'border-red-600' : 'border-gray-300 hover:border-gray-400',
              disabled && 'border-gray-200 bg-gray-90'
            )}
          />
          {/* Custom Checkmark Icon drawn using SVG over the input */}
          <svg
            className="absolute w-3.5 h-3.5 pointer-events-none opacity-0 peer-checked:opacity-100 text-white stroke-current stroke-[3] fill-none stroke-linecap-round stroke-linejoin-round"
            viewBox="0 0 24 24"
          >
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        {label && (
          <span className={cn('text-[14px] font-medium text-gray-900', hasError && 'text-red-700', labelClassName)}>
            {label}
          </span>
        )}
      </label>
    );
  }
);

EzCheck.displayName = 'EzCheck';
