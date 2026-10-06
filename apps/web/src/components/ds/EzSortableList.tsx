import { DragEvent, HTMLAttributes, forwardRef, useState } from 'react';
import { cn } from './utils';
import { GripVertical } from 'lucide-react';

export interface EzSortableListItem {
  id: string | number;
  label: string;
}

export interface EzSortableListProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /**
   * The ordered list of items to render.
   */
  items: EzSortableListItem[];
  /**
   * Called with the new order after an item is dropped in a different position.
   */
  onReorder: (newOrder: EzSortableListItem[]) => void;
}

/**
 * Aponta DS Sortable List (inspired by @sankhyalabs/ezui)
 * A simple drag-to-reorder list using native HTML5 drag & drop (no external library).
 */
export const EzSortableList = forwardRef<HTMLDivElement, EzSortableListProps>(
  ({ items, onReorder, className, ...props }, ref) => {
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [overIndex, setOverIndex] = useState<number | null>(null);

    const handleDragStart = (index: number) => (e: DragEvent<HTMLDivElement>) => {
      setDragIndex(index);
      e.dataTransfer.effectAllowed = 'move';
      try {
        e.dataTransfer.setData('text/plain', String(index));
      } catch {
        // some test environments don't fully implement DataTransfer
      }
    };

    const handleDragOver = (index: number) => (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setOverIndex(index);
    };

    const handleDrop = (index: number) => (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (dragIndex === null || dragIndex === index) {
        setDragIndex(null);
        setOverIndex(null);
        return;
      }
      const newItems = [...items];
      const [moved] = newItems.splice(dragIndex, 1);
      newItems.splice(index, 0, moved);
      onReorder(newItems);
      setDragIndex(null);
      setOverIndex(null);
    };

    const handleDragEnd = () => {
      setDragIndex(null);
      setOverIndex(null);
    };

    return (
      <div ref={ref} className={cn('flex flex-col gap-1.5 w-full', className)} {...props}>
        {items.map((item, index) => (
          <div
            key={item.id}
            draggable
            data-testid={`sortable-item-${item.id}`}
            onDragStart={handleDragStart(index)}
            onDragOver={handleDragOver(index)}
            onDrop={handleDrop(index)}
            onDragEnd={handleDragEnd}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-[8px] border bg-white select-none transition-colors text-[14px] text-gray-900 cursor-grab',
              'border-gray-200',
              dragIndex === index && 'opacity-50 border-brand-300',
              overIndex === index && dragIndex !== index && 'border-brand-500 bg-brand-50'
            )}
          >
            <GripVertical className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="truncate flex-1">{item.label}</span>
          </div>
        ))}
      </div>
    );
  }
);

EzSortableList.displayName = 'EzSortableList';
