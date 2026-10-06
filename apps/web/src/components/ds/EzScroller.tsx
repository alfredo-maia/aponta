import { HTMLAttributes, forwardRef } from 'react';
import { cn } from './utils';

export interface EzScrollerProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Maximum height before scrolling kicks in. Accepts any CSS size
   * (e.g. 240, '240px', '50vh').
   */
  maxHeight?: number | string;
}

/**
 * Aponta DS Scroller
 * Container with custom thin-scrollbar vertical scrolling, handy for long
 * lists inside cards/modals/popovers.
 */
export const EzScroller = forwardRef<HTMLDivElement, EzScrollerProps>(
  ({ maxHeight, className, style, children, ...props }, ref) => {
    const resolvedMaxHeight =
      typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight;

    return (
      <div
        ref={ref}
        style={{ maxHeight: resolvedMaxHeight, ...style }}
        className={cn(
          'overflow-y-auto',
          // Thin custom scrollbar (WebKit + Firefox)
          '[scrollbar-width:thin] [scrollbar-color:var(--color-gray-200)_transparent]',
          '[&::-webkit-scrollbar]:w-1.5',
          '[&::-webkit-scrollbar-track]:bg-transparent',
          '[&::-webkit-scrollbar-thumb]:bg-gray-200',
          '[&::-webkit-scrollbar-thumb]:rounded-full',
          '[&::-webkit-scrollbar-thumb:hover]:bg-gray-300',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

EzScroller.displayName = 'EzScroller';
