import { HTMLAttributes, forwardRef, ReactNode } from 'react';
import { cn } from './utils';

export interface EzTagProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Main text of the tag.
   */
  label: string;
  /**
   * The variant style based on Aponta palettes.
   * @default 'ocean'
   */
  variant?: 'ocean' | 'gray' | 'green' | 'yellow' | 'red' | 'petroleum' | 'outline';
  /**
   * Prepend an icon.
   */
  leftIcon?: ReactNode;
  /**
   * Append an icon (e.g. an "X" button to dismiss).
   */
  rightIcon?: ReactNode;
}

/**
 * Aponta DS Tag (Chip)
 * Pill shaped element for status, categories, or filters.
 */
export const EzTag = forwardRef<HTMLDivElement, EzTagProps>(
  ({ label, variant = 'ocean', leftIcon, rightIcon, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-[24px] px-2.5 py-1 min-w-[32px] min-h-[24px]',
          'text-[12px] font-medium leading-none select-none transition-colors border',
          // Variants mapping to Sankhya semantic colors
          variant === 'ocean' && 'bg-ocean-100/50 text-ocean-700 border-ocean-200',
          variant === 'gray' && 'bg-gray-90 text-gray-700 border-gray-200',
          variant === 'green' && 'bg-green-100 text-green-800 border-green-200',
          variant === 'yellow' && 'bg-yellow-100 text-yellow-800 border-yellow-300',
          variant === 'red' && 'bg-red-100 text-red-800 border-red-200',
          variant === 'petroleum' && 'bg-petroleum-100 text-petroleum-800 border-petroleum-200',
          variant === 'outline' && 'bg-transparent text-gray-700 border-gray-300',
          className
        )}
        {...props}
      >
        {leftIcon && (
          <span className="flex items-center justify-center mr-1.5 -ml-0.5">
            {leftIcon}
          </span>
        )}
        <span>{label}</span>
        {rightIcon && (
          <span className="flex items-center justify-center ml-1.5 -mr-0.5">
            {rightIcon}
          </span>
        )}
      </div>
    );
  }
);

EzTag.displayName = 'EzTag';
