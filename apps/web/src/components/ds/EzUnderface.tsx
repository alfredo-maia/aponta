import { HTMLAttributes, forwardRef } from 'react';
import { cn } from './utils';

export type EzUnderfaceProps = HTMLAttributes<HTMLDivElement>;

/**
 * Aponta DS Underface (inspired by @sankhyalabs/ezui)
 * A "background layer" container used to visually group sections of a page.
 * Shadowless, card-like surface with a subtle background and border.
 */
export const EzUnderface = forwardRef<HTMLDivElement, EzUnderfaceProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('w-full rounded-[12px] border border-gray-100 bg-gray-80 p-4', className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

EzUnderface.displayName = 'EzUnderface';
