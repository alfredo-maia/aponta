import { HTMLAttributes } from 'react';
import { cn } from './utils';

export interface EzGridViewProps extends HTMLAttributes<HTMLDivElement> {
  columns?: 1 | 2 | 3;
}

export function EzGridView({ columns = 3, className, children, ...props }: EzGridViewProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-4',
        columns >= 2 && 'md:grid-cols-2',
        columns >= 3 && 'lg:grid-cols-3',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
