import { InputHTMLAttributes, RefObject, forwardRef, useRef } from 'react';
import { cn } from './utils';
import { AlertCircle, Clock } from 'lucide-react';

export interface EzTimeInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  /**
   * Optional label displayed above the input.
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
}

/**
 * Aponta DS Time Input (inspired by @sankhyalabs/ezui)
 * Wraps the native `<input type="time">` with the DS styling.
 */
export const EzTimeInput = forwardRef<HTMLInputElement, EzTimeInputProps>(
  ({ label, message, hasError = false, className, disabled, id, required, ...props }, ref) => {
    const fallbackRef = useRef<HTMLInputElement>(null);
    const inputRef = (ref as RefObject<HTMLInputElement>) || fallbackRef;

    const wrapperClasses = cn(
      'relative flex items-center w-full overflow-hidden transition-colors border',
      'rounded-[12px] bg-white group h-[42px]',
      'focus-within:border-brand-600 focus-within:ring-1 focus-within:ring-brand-600',
      hasError ? 'border-red-600 ring-red-600' : 'border-gray-200 hover:border-gray-300',
      disabled && 'bg-gray-80 border-gray-100 cursor-not-allowed'
    );

    return (
      <div className={cn('flex flex-col w-full gap-1.5', className)}>
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
            if (!disabled && inputRef.current && 'showPicker' in HTMLInputElement.prototype) {
              try {
                inputRef.current.showPicker();
              } catch {
                inputRef.current.focus();
              }
            }
          }}
        >
          <div className="flex items-center justify-center shrink-0 pl-3 pr-2 text-gray-500">
            <Clock className="w-4 h-4 cursor-pointer" />
          </div>

          <input
            ref={inputRef}
            id={id}
            type="time"
            disabled={disabled}
            required={required}
            className={cn(
              'flex-1 w-full bg-transparent border-none outline-none text-[14px] text-gray-900 placeholder:text-gray-400 h-full pr-3',
              '[&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer',
              disabled && 'text-gray-400 placeholder:text-gray-300 cursor-not-allowed'
            )}
            {...props}
          />
        </div>

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

EzTimeInput.displayName = 'EzTimeInput';
