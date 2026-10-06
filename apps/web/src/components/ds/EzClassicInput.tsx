import { forwardRef, InputHTMLAttributes, ReactNode } from 'react';
import { cn } from './utils';
import { AlertCircle } from 'lucide-react';

export interface EzClassicInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /**
   * The text label displayed above the input.
   */
  label?: string;
  /**
   * Optional helper or error message displayed below the input.
   */
  message?: string;
  /**
   * Indicates an error state (changes border and message color to red).
   */
  hasError?: boolean;
  /**
   * Optional icon to display on the left side inside the input.
   */
  leftIcon?: ReactNode;
  /**
   * Optional icon to display on the right side inside the input.
   */
  rightIcon?: ReactNode;
}

/**
 * Aponta DS Classic Input (inspired by @sankhyalabs/ezui)
 * Dense, square-cornered text input matching the "classic" Sankhya visual.
 */
export const EzClassicInput = forwardRef<HTMLInputElement, EzClassicInputProps>(
  (
    { label, message, hasError = false, leftIcon, rightIcon, className, disabled, type = 'text', required, id, ...props },
    ref
  ) => {
    const wrapperClasses = cn(
      'relative flex items-center w-full overflow-hidden transition-colors border',
      'rounded-none bg-white group h-[32px]',
      'focus-within:border-brand-600 focus-within:ring-1 focus-within:ring-brand-600',
      hasError ? 'border-red-600 ring-red-600' : 'border-gray-300 hover:border-gray-400',
      disabled && 'bg-gray-80 border-gray-200 cursor-not-allowed'
    );

    return (
      <div className={cn('flex flex-col w-full gap-1', className)}>
        {label && (
          <label
            htmlFor={id}
            className={cn(
              'text-[13px] font-medium leading-none mb-0.5 select-none',
              disabled ? 'text-gray-400' : 'text-gray-900',
              hasError && 'text-red-700'
            )}
          >
            {label}
            {required && <span className="ml-1 text-red-600">*</span>}
          </label>
        )}

        <div className={wrapperClasses}>
          {leftIcon && (
            <div
              className={cn(
                'flex items-center justify-center shrink-0 pl-2 pr-1.5 text-gray-500',
                disabled && 'text-gray-300'
              )}
            >
              <span className="w-4 h-4 flex items-center justify-center">{leftIcon}</span>
            </div>
          )}

          <input
            ref={ref}
            id={id}
            type={type}
            disabled={disabled}
            required={required}
            className={cn(
              'flex-1 w-full bg-transparent border-none outline-none text-[13px] text-gray-900 placeholder:text-gray-400 h-full',
              !leftIcon && 'pl-2',
              !rightIcon && 'pr-2',
              disabled && 'text-gray-400 placeholder:text-gray-300 cursor-not-allowed'
            )}
            {...props}
          />

          {rightIcon && (
            <div
              className={cn(
                'flex items-center justify-center shrink-0 pr-2 pl-1.5 text-gray-500',
                disabled && 'text-gray-300'
              )}
            >
              <span className="w-4 h-4 flex items-center justify-center">{rightIcon}</span>
            </div>
          )}
        </div>

        {message && (
          <div
            className={cn(
              'flex items-center gap-1.5 text-[11px] font-medium leading-none mt-0.5',
              hasError ? 'text-red-700' : 'text-gray-500',
              disabled && 'text-gray-400'
            )}
          >
            {hasError && <AlertCircle className="w-3 h-3" />}
            <span>{message}</span>
          </div>
        )}
      </div>
    );
  }
);

EzClassicInput.displayName = 'EzClassicInput';
