import { HTMLAttributes, forwardRef } from 'react';
import { cn } from './utils';

export interface EzScrimProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onClick'> {
  /**
   * Whether the scrim is rendered/visible.
   */
  visible: boolean;
  /**
   * Called when the scrim itself is clicked (typically to dismiss a modal/drawer).
   */
  onClick?: () => void;
  /**
   * Custom stacking order.
   * @default 40
   */
  zIndex?: number;
}

/**
 * Aponta DS Scrim
 * Simple semi-transparent dark overlay layer, usually rendered behind
 * modals/drawers (e.g. `EzModal`, `EzModalContainer`).
 */
export const EzScrim = forwardRef<HTMLDivElement, EzScrimProps>(
  ({ visible, onClick, zIndex = 40, className, style, ...props }, ref) => {
    if (!visible) return null;

    return (
      <div
        ref={ref}
        onClick={onClick}
        style={{ zIndex, ...style }}
        className={cn('fixed inset-0 bg-black/50 transition-opacity animate-in fade-in duration-200', className)}
        {...props}
      />
    );
  }
);

EzScrim.displayName = 'EzScrim';
