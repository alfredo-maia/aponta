import { HTMLAttributes, forwardRef, ReactNode } from 'react';
import { cn } from './utils';

export interface EzListProps extends HTMLAttributes<HTMLUListElement> {
  flush?: boolean;
}

export const EzList = forwardRef<HTMLUListElement, EzListProps>(
  ({ flush = false, className, children, ...props }, ref) => {
    return (
      <ul
        ref={ref}
        className={cn(
          'flex flex-col w-full bg-white rounded-[12px]',
          !flush && 'border border-gray-200 divide-y divide-gray-100',
          className
        )}
        {...props}
      >
        {children}
      </ul>
    );
  }
);
EzList.displayName = 'EzList';

export interface EzListItemProps extends HTMLAttributes<HTMLLIElement> {
  leading?: ReactNode;
  description?: ReactNode;
  trailing?: ReactNode;
}

export const EzListItem = forwardRef<HTMLLIElement, EzListItemProps>(
  ({ leading, description, trailing, onClick, className, children, ...props }, ref) => {
    return (
      <li
        ref={ref}
        onClick={onClick}
        className={cn(
          'flex items-center justify-between w-full px-4 py-3 transition-colors text-left outline-none focus-visible:bg-gray-80 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ocean-200',
          onClick && 'cursor-pointer hover:bg-gray-50',
          className
        )}
        {...props}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          {leading && <div className="shrink-0">{leading}</div>}
          <div className="flex flex-col truncate">
            <span className="text-[14px] font-medium text-gray-900 truncate">
              {children}
            </span>
            {description && (
              <span className="text-[12px] text-gray-500 font-medium truncate mt-0.5">
                {description}
              </span>
            )}
          </div>
        </div>
        {trailing && <div className="shrink-0 ml-4 flex items-center gap-2">{trailing}</div>}
      </li>
    );
  }
);
EzListItem.displayName = 'EzListItem';