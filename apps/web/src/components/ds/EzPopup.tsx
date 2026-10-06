import { HTMLAttributes, forwardRef, ReactNode, useEffect, useRef } from 'react';
import { cn } from './utils';

export interface EzPopupProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * The element that triggers opening the popup when clicked.
   */
  trigger: ReactNode;
  /**
   * Controls whether the popup content is visible.
   */
  open: boolean;
  /**
   * Called when the user clicks outside the popup (dismiss).
   */
  onClose: () => void;
  /**
   * Side of the trigger the popup floats near.
   * @default 'bottom'
   */
  position?: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * Aponta DS Popup
 * A simple floating panel positioned near a trigger element, with NO dark
 * overlay behind it (unlike `EzModal`). Closes on outside click.
 */
export const EzPopup = forwardRef<HTMLDivElement, EzPopupProps>(
  ({ trigger, open, onClose, position = 'bottom', className, children, ...props }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (!open) return;
      const handleOutsideClick = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          onClose();
        }
      };
      document.addEventListener('mousedown', handleOutsideClick);
      return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [open, onClose]);

    return (
      <div className="relative inline-block" ref={containerRef}>
        <div className="cursor-pointer">{trigger}</div>

        {open && (
          <div
            ref={ref}
            role="dialog"
            className={cn(
              'absolute z-50 rounded-[12px] bg-white shadow-[0_4px_24px_rgba(0,0,0,0.12)] border border-gray-100 p-3 animate-in fade-in zoom-in-95 duration-100',
              position === 'bottom' && 'top-full mt-2 left-0',
              position === 'top' && 'bottom-full mb-2 left-0',
              position === 'left' && 'right-full mr-2 top-0',
              position === 'right' && 'left-full ml-2 top-0',
              className
            )}
            {...props}
          >
            {children}
          </div>
        )}
      </div>
    );
  }
);

EzPopup.displayName = 'EzPopup';
