import { InputHTMLAttributes, forwardRef, ReactNode } from 'react';
import { cn } from './utils';

export interface EzRadioButtonProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string | ReactNode;
  hasError?: boolean;
}

/**
 * Aponta DS Radio Button
 */
export const EzRadioButton = forwardRef<HTMLInputElement, EzRadioButtonProps>(
  ({ label, hasError, className, disabled, id, ...props }, ref) => {
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
            type="radio"
            id={id}
            ref={ref}
            disabled={disabled}
            className={cn(
              'peer appearance-none w-5 h-5 border-2 rounded-full transition-colors',
              'checked:border-brand-600 focus-visible:ring-2 focus-visible:ring-brand-200 focus:outline-none',
              hasError ? 'border-red-600' : 'border-gray-300 hover:border-gray-400',
              disabled && 'border-gray-200 bg-gray-90'
            )}
          />
          {/* Inner dot */}
          <div className="absolute w-2.5 h-2.5 rounded-full bg-brand-600 opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
        </div>
        {label && (
          <span className={cn('text-[14px] font-medium text-gray-900', hasError && 'text-red-700')}>
            {label}
          </span>
        )}
      </label>
    );
  }
);

EzRadioButton.displayName = 'EzRadioButton';
