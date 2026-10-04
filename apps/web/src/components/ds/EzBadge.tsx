import { HTMLAttributes, forwardRef } from 'react';
import { cn } from './utils';

export interface EzBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /**
   * The size of the badge.
   * @default 'medium'
   */
  size?: 'x-small' | 'small' | 'medium' | 'large';
  /**
   * Optional custom color classes (e.g. 'bg-red-500 text-white').
   * If omitted, defaults to Ocean Green.
   */
  colorClass?: string;
}

/**
 * Aponta DS Badge
 * Small numeric or status indicator, usually a circle or rounded rectangle.
 */
export const EzBadge = forwardRef<HTMLSpanElement, EzBadgeProps>(
  ({ size = 'medium', colorClass, className, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-full font-medium',
          // Default colors if none passed
          !colorClass && 'bg-ocean-600 text-gray-70',
          colorClass,
          // Sizes mapping directly to Sankhya's xs to xl concepts
          size === 'x-small' && 'min-w-[12px] h-[12px] text-[10px] px-1',
          size === 'small' && 'min-w-[16px] h-[16px] text-[11px] px-1.5',
          size === 'medium' && 'min-w-[20px] h-[20px] text-[12px] px-2',
          size === 'large' && 'min-w-[24px] h-[24px] text-[14px] px-2.5',
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);

EzBadge.displayName = 'EzBadge';
