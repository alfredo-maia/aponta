import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from './utils';

export interface EzDateTimeInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string;
  hasError?: boolean;
}

export const EzDateTimeInput = forwardRef<HTMLInputElement, EzDateTimeInputProps>(
  ({ label, hasError = false, className, disabled, id, ...props }, ref) => {
    return (
      <div className="flex flex-col w-full gap-1">
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
          </label>
        )}
        <input
          ref={ref}
          id={id}
          type="datetime-local"
          disabled={disabled}
          className={cn(
            'h-[32px] w-full rounded-none border bg-white px-2 text-[13px] text-gray-900 outline-none transition-colors',
            'focus:border-brand-600 focus:ring-1 focus:ring-brand-600',
            hasError ? 'border-red-600' : 'border-gray-300 hover:border-gray-400',
            disabled && 'cursor-not-allowed bg-gray-80 text-gray-400',
            className
          )}
          {...props}
        />
      </div>
    );
  }
);

EzDateTimeInput.displayName = 'EzDateTimeInput';
