import { HTMLAttributes, forwardRef } from 'react';
import { cn } from './utils';
import { Loader2 } from 'lucide-react';

export interface EzSpinnerProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * The size defining width and height in pixels.
   * @default 24
   */
  size?: number;
  /**
   * Optional custom color classes.
   * Defaults to Ocean Green.
   */
  colorClass?: string;
  /**
   * Optional label text to appear below the spinner.
   */
  label?: string;
}

/**
 * Aponta DS Spinner
 * Indicates a loading state or ongoing process.
 */
export const EzSpinner = forwardRef<HTMLDivElement, EzSpinnerProps>(
  ({ size = 24, colorClass, label, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('inline-flex flex-col items-center justify-center gap-2', className)}
        {...props}
      >
        <Loader2
          size={size}
          className={cn('animate-spin', colorClass || 'text-brand-600')}
        />
        {label && (
          <span className={cn('text-sm font-medium', colorClass || 'text-brand-700')}>
            {label}
          </span>
        )}
      </div>
    );
  }
);

EzSpinner.displayName = 'EzSpinner';
