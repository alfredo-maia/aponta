import { HTMLAttributes, forwardRef } from 'react';
import { cn } from './utils';

export interface EzSkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Layout type for the skeleton.
   * @default 'text'
   */
  variant?: 'text' | 'circular' | 'rectangular';
  /**
   * Explicit width. If omitted, text defaults to 100%.
   */
  width?: string | number;
  /**
   * Explicit height.
   */
  height?: string | number;
}

/**
 * Aponta DS Skeleton
 * Used as a placeholder before the actual content loads.
 */
export const EzSkeleton = forwardRef<HTMLDivElement, EzSkeletonProps>(
  ({ variant = 'text', width, height, className, style, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'animate-pulse bg-gray-200',
          variant === 'text' && 'rounded-md h-4 my-1 w-full',
          variant === 'circular' && 'rounded-full h-10 w-10 shrink-0',
          variant === 'rectangular' && 'rounded-xl h-24 w-full',
          className
        )}
        style={{
          width: width ?? style?.width,
          height: height ?? style?.height,
          ...style,
        }}
        {...props}
      />
    );
  }
);

EzSkeleton.displayName = 'EzSkeleton';
