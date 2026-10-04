import { HTMLAttributes, forwardRef, ReactNode } from 'react';
import { cn } from './utils';

export interface EzIconProps extends HTMLAttributes<HTMLSpanElement> {
  /** The SVG element or lucide-react icon component to render */
  icon: ReactNode;
  /**
   * Predefined sizes.
   * @default 'medium'
   */
  size?: 'small' | 'medium' | 'large' | 'x-large';
  /**
   * Color class to apply.
   */
  colorClass?: string;
}

/**
 * Aponta DS Icon
 * Standardizes an icon's container size and alignment.
 */
export const EzIcon = forwardRef<HTMLSpanElement, EzIconProps>(
  ({ icon, size = 'medium', colorClass, className, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center shrink-0 transition-colors',
          size === 'small' && 'w-3 h-3',
          size === 'medium' && 'w-4 h-4',
          size === 'large' && 'w-5 h-5',
          size === 'x-large' && 'w-6 h-6',
          colorClass || 'text-current',
          className
        )}
        {...props}
      >
        {icon}
      </span>
    );
  }
);
EzIcon.displayName = 'EzIcon';
