import { HTMLAttributes, forwardRef, ReactNode } from 'react';
import { cn } from './utils';
import { X } from 'lucide-react';

export interface EzPopoverPlusProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /**
   * The element that triggers opening the popover when clicked.
   */
  trigger: ReactNode;
  /**
   * Optional title shown in the popover header, next to the close button.
   */
  title?: ReactNode;
  /**
   * Controls whether the popover content is visible.
   */
  open: boolean;
  /**
   * Called when the explicit close (X) button is clicked.
   */
  onClose: () => void;
  /**
   * Alignment of the panel relative to the trigger.
   * @default 'center'
   */
  align?: 'left' | 'right' | 'center';
  /**
   * Vertical position of the panel relative to the trigger.
   * @default 'bottom'
   */
  position?: 'top' | 'bottom';
}

/**
 * Aponta DS Popover Plus
 * A richer variant of `EzPopover` with an explicit header (title + close
 * button) instead of relying only on outside-click to dismiss. Open state
 * is controlled externally via `open`/`onClose`.
 */
export const EzPopoverPlus = forwardRef<HTMLDivElement, EzPopoverPlusProps>(
  ({ trigger, title, open, onClose, align = 'center', position = 'bottom', className, children, ...props }, ref) => {
    return (
      <div className="relative inline-block">
        <div className="cursor-pointer">{trigger}</div>

        {open && (
          <div
            ref={ref}
            role="dialog"
            className={cn(
              'absolute z-50 min-w-[240px] rounded-[16px] bg-white shadow-[0_4px_24px_rgba(0,0,0,0.12)] border border-gray-100 animate-in fade-in zoom-in-95 duration-100',
              position === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2',
              align === 'left' && 'left-0 origin-top-left',
              align === 'right' && 'right-0 origin-top-right',
              align === 'center' && 'left-1/2 -translate-x-1/2 origin-top',
              className
            )}
            {...props}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="text-[14px] font-semibold text-gray-900 pr-2">{title}</div>
              <button
                onClick={onClose}
                aria-label="Fechar"
                className="p-1 -mr-1 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 text-[14px] text-gray-700 font-medium">{children}</div>
          </div>
        )}
      </div>
    );
  }
);

EzPopoverPlus.displayName = 'EzPopoverPlus';
