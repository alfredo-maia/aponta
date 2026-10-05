import { HTMLAttributes, forwardRef, ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from './utils';
import { X } from 'lucide-react';

export interface EzModalProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  footer?: ReactNode;
  /** Prevent closing when clicking outside */
  preventOutsideClose?: boolean;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
}

/**
 * Aponta DS Modal (Dialog)
 */
export const EzModal = forwardRef<HTMLDivElement, EzModalProps>(
  ({ isOpen, onClose, title, footer, preventOutsideClose = false, maxWidth = 'md', className, children, ...props }, ref) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
      setMounted(true);
    }, []);

    // Prevent body scroll when open
    useEffect(() => {
      if (isOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
      return () => {
        document.body.style.overflow = '';
      };
    }, [isOpen]);

    // Handle escape key
    useEffect(() => {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && isOpen) onClose();
      };
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    if (!mounted || !isOpen) return null;

    const maxWidthClass = {
      'sm': 'max-w-sm',
      'md': 'max-w-md',
      'lg': 'max-w-lg',
      'xl': 'max-w-xl',
      '2xl': 'max-w-2xl',
      'full': 'max-w-[calc(100%-2rem)]',
    }[maxWidth];

    const content = (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center sm:py-8 sm:px-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-gray-900/60 transition-opacity animate-in fade-in duration-200"
          onClick={() => !preventOutsideClose && onClose()}
        />

        {/* Dialog */}
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          className={cn(
            'relative flex flex-col w-full h-full sm:h-auto bg-white sm:rounded-[24px] shadow-2xl animate-in zoom-in-95 duration-200',
            maxWidthClass,
            className
          )}
          {...props}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="text-[18px] font-semibold text-gray-900 pr-4">
              {title}
            </div>
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
            <div className="flex items-center justify-end px-6 py-4 border-t border-gray-100 gap-3 bg-gray-90/50 sm:rounded-b-[24px]">
              {footer}
            </div>
          )}
        </div>
      </div>
    );

    return createPortal(content, document.body);
  }
);

EzModal.displayName = 'EzModal';
