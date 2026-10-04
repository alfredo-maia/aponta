import { HTMLAttributes, forwardRef, ReactNode } from 'react';
import { cn } from './utils';

export interface EzCardItemProps extends HTMLAttributes<HTMLDivElement> {
  /** Make it subtle without a heavy box-shadow */
  flat?: boolean;
}

export const EzCardItem = forwardRef<HTMLDivElement, EzCardItemProps>(
  ({ flat = false, className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col w-full bg-white rounded-[16px] border border-gray-100 transition-all',
          !flat && 'shadow-sm hover:shadow-md',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
EzCardItem.displayName = 'EzCardItem';

export interface EzEmptyCardProps extends HTMLAttributes<HTMLDivElement> {
  icon?: ReactNode;
  title?: string;
  description?: string;
  action?: ReactNode;
}

export const EzEmptyCard = forwardRef<HTMLDivElement, EzEmptyCardProps>(
  ({ icon, title, description, action, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col items-center justify-center w-full p-8 text-center bg-gray-50 rounded-[16px] border border-dashed border-gray-200',
          className
        )}
        {...props}
      >
        {icon && <div className="mb-4 text-gray-400">{icon}</div>}
        {title && <h3 className="text-[16px] font-semibold text-gray-900 mb-1">{title}</h3>}
        {description && <p className="text-[14px] text-gray-500 max-w-sm mb-4">{description}</p>}
        {action && <div>{action}</div>}
      </div>
    );
  }
);
EzEmptyCard.displayName = 'EzEmptyCard';
