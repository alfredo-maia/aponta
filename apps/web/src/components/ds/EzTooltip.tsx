import { HTMLAttributes, forwardRef, ReactNode } from 'react';
import { cn } from './utils';

export interface EzTooltipProps extends Omit<HTMLAttributes<HTMLDivElement>, 'content'> {
  /**
   * Text or content to show inside the tooltip bubble.
   */
  content: ReactNode;
  /**
   * Position relative to the wrapped element.
   * @default 'top'
   */
  position?: 'top' | 'bottom' | 'left' | 'right';
  /**
   * Delay in milliseconds before showing tooltip (via inline style).
   * @default 200
   */
  delay?: number;
}

/**
 * Aponta DS Tooltip
 * Extremely lightweight CSS-only hover tooltip mimicking the DS look without heavy Radix dependencies.
 * Wraps around the trigger element.
 */
export const EzTooltip = forwardRef<HTMLDivElement, EzTooltipProps>(
  ({ content, position = 'top', delay = 200, className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('relative group inline-flex', className)}
        {...props}
      >
        {children}
        
        {/* Tooltip Bubble */}
        <div
          style={{ transitionDelay: `${delay}ms` }}
          className={cn(
            'absolute hidden group-hover:flex items-center justify-center pointer-events-none',
            'opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50',
            'px-2 py-1 text-xs font-medium text-white bg-gray-1000/90 rounded-[8px] shadow-lg shadow-gray-900/10',
            // Position classes
            position === 'top' && 'bottom-full left-1/2 -translate-x-1/2 -translate-y-2',
            position === 'bottom' && 'top-full left-1/2 -translate-x-1/2 translate-y-2',
            position === 'left' && 'right-full top-1/2 -translate-y-1/2 -translate-x-2',
            position === 'right' && 'left-full top-1/2 -translate-y-1/2 translate-x-2'
          )}
        >
          {content}
          
          {/* Arrow pointing to element */}
          <div
            className={cn(
              'absolute w-2 h-2 bg-gray-1000/90 rotate-45',
              position === 'top' && 'bottom-[-4px] left-1/2 -translate-x-1/2',
              position === 'bottom' && 'top-[-4px] left-1/2 -translate-x-1/2',
              position === 'left' && 'right-[-4px] top-1/2 -translate-y-1/2',
              position === 'right' && 'left-[-4px] top-1/2 -translate-y-1/2'
            )}
          />
        </div>
      </div>
    );
  }
);

EzTooltip.displayName = 'EzTooltip';
