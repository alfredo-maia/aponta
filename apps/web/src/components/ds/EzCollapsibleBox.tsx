import { HTMLAttributes, ReactNode, forwardRef, useState } from 'react';
import { cn } from './utils';
import { ChevronDown, ChevronUp } from 'lucide-react';

export interface EzCollapsibleBoxProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /**
   * Title displayed in the clickable header.
   */
  title: ReactNode;
  /**
   * Whether the box starts expanded.
   * @default false
   */
  defaultOpen?: boolean;
  /**
   * Content rendered inside the collapsible area.
   */
  children?: ReactNode;
}

/**
 * Aponta DS Collapsible Box (inspired by @sankhyalabs/ezui)
 * A box with a clickable header that expands/collapses its content.
 */
export const EzCollapsibleBox = forwardRef<HTMLDivElement, EzCollapsibleBoxProps>(
  ({ title, defaultOpen = false, children, className, ...props }, ref) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
      <div
        ref={ref}
        className={cn('w-full rounded-[12px] border border-gray-200 bg-white overflow-hidden', className)}
        {...props}
      >
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          className={cn(
            'flex w-full items-center justify-between gap-2 px-4 py-3 text-left transition-colors',
            'text-[14px] font-semibold text-gray-900 hover:bg-gray-80',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200'
          )}
        >
          <span>{title}</span>
          {isOpen ? (
            <ChevronUp className="w-4 h-4 shrink-0 text-gray-500 transition-transform" />
          ) : (
            <ChevronDown className="w-4 h-4 shrink-0 text-gray-500 transition-transform" />
          )}
        </button>

        {isOpen && (
          <div className="px-4 py-3 border-t border-gray-200 text-[14px] text-gray-700">
            {children}
          </div>
        )}
      </div>
    );
  }
);

EzCollapsibleBox.displayName = 'EzCollapsibleBox';
