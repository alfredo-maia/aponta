import { HTMLAttributes, forwardRef, ReactNode } from 'react';
import { cn } from './utils';
import { X } from 'lucide-react';

export interface EzModalContainerProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /**
   * Title rendered in the header area.
   */
  title: ReactNode;
  /**
   * Called when the close (X) button is clicked.
   */
  onClose: () => void;
  /**
   * Optional footer content (usually action buttons), right-aligned.
   */
  footer?: ReactNode;
}

/**
 * Aponta DS Modal Container
 * Internal layout wrapper used INSIDE `EzModal` to structure its content:
 * header (title + close button), padded body, and footer action area.
 * Does not render its own overlay/portal — use `EzModal` or `EzScrim` for that.
 */
export const EzModalContainer = forwardRef<HTMLDivElement, EzModalContainerProps>(
  ({ title, onClose, footer, className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex flex-col w-full h-full bg-white rounded-[24px] overflow-hidden', className)}
        {...props}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="text-[18px] font-semibold text-gray-900 pr-4">{title}</div>
          <button
            onClick={onClose}
            className="p-2 -mr-2 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 shrink-0"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 text-[14px] text-gray-700 font-medium">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end px-6 py-4 border-t border-gray-100 gap-3 bg-gray-90/50">
            {footer}
          </div>
        )}
      </div>
    );
  }
);

EzModalContainer.displayName = 'EzModalContainer';
