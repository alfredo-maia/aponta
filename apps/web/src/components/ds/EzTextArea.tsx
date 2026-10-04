import { TextareaHTMLAttributes, forwardRef } from 'react';
import { cn } from './utils';
import { AlertCircle } from 'lucide-react';

export interface EzTextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  message?: string;
  hasError?: boolean;
}

/**
 * Aponta DS Text Area
 */
export const EzTextArea = forwardRef<HTMLTextAreaElement, EzTextAreaProps>(
  ({ label, message, hasError, className, disabled, id, required, ...props }, ref) => {
    const wrapperClasses = cn(
      'relative flex w-full overflow-hidden transition-colors border',
      'rounded-[12px] bg-white group',
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

        <div className={wrapperClasses}>
          <textarea
            ref={ref}
            id={id}
            disabled={disabled}
            required={required}
            className={cn(
              'flex-1 w-full bg-transparent border-none outline-none text-[14px] text-gray-900 placeholder:text-gray-400',
              'min-h-[80px] p-3 resize-y',
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

EzTextArea.displayName = 'EzTextArea';
