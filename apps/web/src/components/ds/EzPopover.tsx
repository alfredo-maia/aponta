import { HTMLAttributes, forwardRef, ReactNode, useEffect, useRef, useState } from 'react';
import { cn } from './utils';

export interface EzPopoverProps extends Omit<HTMLAttributes<HTMLDivElement>, 'content'> {
  trigger: ReactNode;
  content: ReactNode;
  align?: 'left' | 'right' | 'center';
  position?: 'top' | 'bottom';
}

/**
 * Aponta DS Popover
 * Element triggered by click to display rich content (unlike tooltip which is simple text/hover).
 */
export const EzPopover = forwardRef<HTMLDivElement, EzPopoverProps>(
  ({ trigger, content, align = 'center', position = 'bottom', className, ...props }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handleOutsideClick = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setIsOpen(false);
        }
      };
      document.addEventListener('mousedown', handleOutsideClick);
      return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, []);

    return (
      <div className="relative inline-block" ref={containerRef}>
        <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
          {trigger}
        </div>

        {isOpen && (
          <div
            ref={ref}
            className={cn(
              'absolute z-50 rounded-[16px] bg-white shadow-[0_4px_24px_rgba(0,0,0,0.12)] border border-gray-100 p-4 animate-in fade-in zoom-in-95 duration-100',
              // Y position
              position === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2',
              // X align
              align === 'left' && 'left-0 origin-top-left',
              align === 'right' && 'right-0 origin-top-right',
              align === 'center' && 'left-1/2 -translate-x-1/2 origin-top',
              className
            )}
            {...props}
          >
            {content}
          </div>
        )}
      </div>
    );
  }
);

EzPopover.displayName = 'EzPopover';
