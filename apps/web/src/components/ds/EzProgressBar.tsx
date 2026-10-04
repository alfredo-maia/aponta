import { HTMLAttributes, forwardRef } from 'react';
import { cn } from './utils';

export interface EzProgressBarProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Progress value (0 to 100).
   */
  value: number;
  /**
   * Displays the percentage label.
   */
  showLabel?: boolean;
  /**
   * Height size class.
   * @default 'h-2'
   */
  sizeClass?: string;
  /**
   * Foreground color class.
   * @default 'bg-brand-600'
   */
  colorClass?: string;
}

/**
 * Aponta DS Progress Bar
 */
export const EzProgressBar = forwardRef<HTMLDivElement, EzProgressBarProps>(
  ({ value, showLabel = false, sizeClass = 'h-2', colorClass = 'bg-brand-600', className, ...props }, ref) => {
    const clampedValue = Math.min(100, Math.max(0, value));

    return (
      <div ref={ref} className={cn('flex flex-col gap-1 w-full', className)} {...props}>
        {showLabel && (
          <div className="flex justify-end text-xs font-semibold text-gray-700">
            {Math.round(clampedValue)}%
          </div>
        )}
        <div className={cn('w-full bg-gray-100 rounded-full overflow-hidden', sizeClass)}>
          <div
            className={cn('h-full transition-all duration-300 ease-in-out', colorClass)}
            style={{ width: `${clampedValue}%` }}
          />
        </div>
      </div>
    );
  }
);

EzProgressBar.displayName = 'EzProgressBar';
