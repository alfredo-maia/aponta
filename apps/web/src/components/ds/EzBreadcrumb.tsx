import { HTMLAttributes, forwardRef, ReactNode } from 'react';
import { cn } from './utils';
import { ChevronRight } from 'lucide-react';

export interface EzBreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: ReactNode;
}

export interface EzBreadcrumbProps extends HTMLAttributes<HTMLElement> {
  items: EzBreadcrumbItem[];
}

/**
 * Aponta DS Breadcrumb
 * Indicates current page's location within a navigational hierarchy.
 */
export const EzBreadcrumb = forwardRef<HTMLElement, EzBreadcrumbProps>(
  ({ items, className, ...props }, ref) => {
    return (
      <nav ref={ref} aria-label="Breadcrumb" className={cn('flex items-center text-[14px]', className)} {...props}>
        <ol className="flex items-center space-x-1.5 md:space-x-2">
          {items.map((item, index) => {
            const isLast = index === items.length - 1;
            const Component = item.href ? 'a' : item.onClick ? 'button' : 'span';
            
            return (
              <li key={index} className="flex items-center">
                {index > 0 && (
                  <ChevronRight className="w-4 h-4 text-gray-300 mx-1 shrink-0" />
                )}
                <Component
                  href={item.href}
                  onClick={item.onClick}
                  aria-current={isLast ? 'page' : undefined}
                  className={cn(
                    'inline-flex items-center gap-1.5 transition-colors font-medium',
                    isLast 
                      ? 'text-brand-600 cursor-default pointer-events-none' 
                      : 'text-gray-500 hover:text-brand-600',
                    (item.href || item.onClick) && !isLast && 'cursor-pointer'
                  )}
                >
                  {item.icon && <span className="w-4 h-4">{item.icon}</span>}
                  {item.label}
                </Component>
              </li>
            );
          })}
        </ol>
      </nav>
    );
  }
);

EzBreadcrumb.displayName = 'EzBreadcrumb';
