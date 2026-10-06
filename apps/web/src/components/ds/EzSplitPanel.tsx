import {
  HTMLAttributes,
  ReactNode,
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { cn } from './utils';
import { GripVertical } from 'lucide-react';

export interface EzSplitPanelProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /**
   * Content rendered in the left/top panel.
   */
  left: ReactNode;
  /**
   * Content rendered in the right/bottom panel.
   */
  right: ReactNode;
  /**
   * Initial width of the left panel, as a percentage (0-100).
   * @default 50
   */
  defaultSplit?: number;
  /**
   * Minimum percentage the left panel can be resized to.
   * @default 10
   */
  minSplit?: number;
  /**
   * Maximum percentage the left panel can be resized to.
   * @default 90
   */
  maxSplit?: number;
}

/**
 * Aponta DS Split Panel (inspired by @sankhyalabs/ezui)
 * Two side-by-side panels separated by a draggable divider.
 */
export const EzSplitPanel = forwardRef<HTMLDivElement, EzSplitPanelProps>(
  ({ left, right, defaultSplit = 50, minSplit = 10, maxSplit = 90, className, ...props }, ref) => {
    const [split, setSplit] = useState(defaultSplit);
    const containerRef = useRef<HTMLDivElement>(null);
    const draggingRef = useRef(false);

    useImperativeHandle(ref, () => containerRef.current as HTMLDivElement);

    const handleMouseMove = useCallback(
      (e: MouseEvent) => {
        if (!draggingRef.current || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width <= 0) return;
        let pct = ((e.clientX - rect.left) / rect.width) * 100;
        pct = Math.min(maxSplit, Math.max(minSplit, pct));
        setSplit(pct);
      },
      [minSplit, maxSplit]
    );

    const stopDrag = useCallback(() => {
      draggingRef.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', stopDrag);
    }, [handleMouseMove]);

    const startDrag = () => {
      draggingRef.current = true;
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', stopDrag);
    };

    return (
      <div ref={containerRef} className={cn('flex w-full h-full relative', className)} {...props}>
        <div data-testid="split-panel-left" style={{ width: `${split}%` }} className="overflow-auto min-w-0">
          {left}
        </div>
        <div
          role="separator"
          aria-orientation="vertical"
          data-testid="split-panel-divider"
          onMouseDown={startDrag}
          className={cn(
            'flex items-center justify-center w-[6px] shrink-0 cursor-col-resize relative',
            'bg-gray-90 hover:bg-brand-200 transition-colors group'
          )}
        >
          <GripVertical className="w-3 h-3 text-gray-400 group-hover:text-brand-600 absolute pointer-events-none" />
        </div>
        <div data-testid="split-panel-right" style={{ width: `${100 - split}%` }} className="overflow-auto min-w-0">
          {right}
        </div>
      </div>
    );
  }
);

EzSplitPanel.displayName = 'EzSplitPanel';
