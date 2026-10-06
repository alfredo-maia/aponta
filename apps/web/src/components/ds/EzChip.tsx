import { HTMLAttributes, forwardRef } from 'react';
import { cn } from './utils';
import { X } from 'lucide-react';

export interface EzChipProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Main text of the chip.
   */
  label: string;
  /**
   * Called when the remove ("x") button is clicked. If omitted, no remove button is rendered.
   */
  onRemove?: () => void;
  /**
   * Custom color classes (background + text + border) overriding the default brand look.
   * @default 'bg-brand-100/50 text-brand-700 border-brand-200'
   */
  colorClass?: string;
  /**
   * Disables the remove interaction.
   */
  disabled?: boolean;
}

/**
 * Aponta DS Chip (inspired by @sankhyalabs/ezui)
 * Small removable tag, similar to EzTag but with a dedicated "x" remove button.
 */
export const EzChip = forwardRef<HTMLDivElement, EzChipProps>(
  (
    { label, onRemove, colorClass = 'bg-brand-100/50 text-brand-700 border-brand-200', disabled, className, ...props },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-[24px] px-2.5 py-1 min-h-[24px] border',
          'text-[12px] font-medium leading-none select-none transition-colors',
          colorClass,
          disabled && 'opacity-50',
          className
        )}
        {...props}
      >
        <span>{label}</span>
        {onRemove && (
          <button
            type="button"
            disabled={disabled}
            onClick={onRemove}
            aria-label={`Remover ${label}`}
            className={cn(
              'flex items-center justify-center rounded-full -mr-0.5 h-4 w-4 transition-colors',
              'hover:bg-black/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200',
              disabled && 'cursor-not-allowed pointer-events-none'
            )}
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  }
);

EzChip.displayName = 'EzChip';
