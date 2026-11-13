import { HTMLAttributes, forwardRef, ReactNode, useEffect, useRef, useState } from 'react';
import { cn } from './utils';

export interface EzPopoverProps extends Omit<HTMLAttributes<HTMLDivElement>, 'content'> {
  trigger: ReactNode;
  content: ReactNode;
  align?: 'left' | 'right' | 'center';
  position?: 'top' | 'bottom';
  /** Controla o painel de fora; sem isso o popover cuida do próprio estado. */
  open?: boolean;
  /** Chamado quando o painel abre ou fecha (clique no gatilho ou fora). */
  onOpenChange?: (open: boolean) => void;
}

/**
 * Aponta DS Popover
 * Element triggered by click to display rich content (unlike tooltip which is simple text/hover).
 */
export const EzPopover = forwardRef<HTMLDivElement, EzPopoverProps>(
  ({ trigger, content, align = 'center', position = 'bottom', open, onOpenChange, className, ...props }, ref) => {
    const [internalOpen, setInternalOpen] = useState(false);
    const isOpen = open ?? internalOpen;
    // Refs: o listener de clique fora é registrado uma vez e precisa do estado e do callback mais recentes.
    const isOpenRef = useRef(isOpen);
    isOpenRef.current = isOpen;
    const onOpenChangeRef = useRef(onOpenChange);
    onOpenChangeRef.current = onOpenChange;
    const setIsOpen = (next: boolean) => {
      setInternalOpen(next);
      onOpenChangeRef.current?.(next);
    };
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handleOutsideClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement | null;
        if (!target) return;
        if (containerRef.current?.contains(target)) return;
        // Native <select> option lists render outside this React tree.
        // Closing on that mousedown would drop the popover before change.
        if (target.tagName === 'OPTION' || target.tagName === 'SELECT' || target.closest('select')) {
          return;
        }
        const active = document.activeElement;
        if (
          active instanceof HTMLSelectElement &&
          containerRef.current?.contains(active)
        ) {
          return;
        }
        if (isOpenRef.current) setIsOpen(false);
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
