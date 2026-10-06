import { HTMLAttributes, forwardRef, ReactNode } from 'react';
import { cn } from './utils';

export interface EzListItemProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /**
   * Main title text of the list item.
   */
  title: ReactNode;
  /**
   * Secondary, smaller text shown below the title.
   */
  subtitle?: ReactNode;
  /**
   * Optional icon or avatar displayed on the left side.
   */
  icon?: ReactNode;
  /**
   * Optional content (button, badge, chevron, etc.) displayed on the right side.
   */
  rightContent?: ReactNode;
  /**
   * Marks the item as currently selected (highlighted background/border).
   */
  selected?: boolean;
}

/**
 * Aponta DS List Item
 * Reusable single list row: optional leading icon, title + subtitle, and
 * optional trailing action/content. Use inside `EzList`, `EzScroller`, etc.
 */
export const EzListItem = forwardRef<HTMLDivElement, EzListItemProps>(
  ({ title, subtitle, icon, rightContent, selected = false, onClick, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onClick={onClick}
        onKeyDown={(e) => {
          if (onClick && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onClick(e as unknown as React.MouseEvent<HTMLDivElement>);
          }
        }}
        className={cn(
          'flex items-center justify-between w-full gap-3 px-4 py-3 transition-colors text-left outline-none rounded-[8px]',
          onClick && 'cursor-pointer hover:bg-gray-90 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-200',
          selected && 'bg-brand-50 hover:bg-brand-50',
          className
        )}
        {...props}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          {icon && (
            <div
              className={cn(
                'shrink-0 flex items-center justify-center w-9 h-9 rounded-full',
                selected ? 'bg-brand-100 text-brand-700' : 'bg-gray-90 text-gray-500'
              )}
            >
              {icon}
            </div>
          )}
          <div className="flex flex-col truncate">
            <span
              className={cn(
                'text-[14px] font-medium truncate',
                selected ? 'text-brand-700' : 'text-gray-900'
              )}
            >
              {title}
            </span>
            {subtitle && (
              <span className="text-[12px] text-gray-500 font-medium truncate mt-0.5">
                {subtitle}
              </span>
            )}
          </div>
        </div>

        {rightContent && (
          <div className="shrink-0 ml-2 flex items-center gap-2">{rightContent}</div>
        )}
      </div>
    );
  }
);

EzListItem.displayName = 'EzListItem';
