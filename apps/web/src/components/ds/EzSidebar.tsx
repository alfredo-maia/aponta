import { HTMLAttributes, forwardRef } from 'react';
import { cn } from './utils';

export interface EzSidebarNavigatorProps extends HTMLAttributes<HTMLElement> {
  /** The navigation items will be passed as children (usually `EzSidebarButton`s) */
  collapsed?: boolean;
}

export const EzSidebarNavigator = forwardRef<HTMLElement, EzSidebarNavigatorProps>(
  ({ collapsed = false, className, children, ...props }, ref) => {
    return (
      <nav
        ref={ref}
        className={cn(
          'flex flex-col h-full bg-white border-r border-gray-200 transition-all duration-300',
          collapsed ? 'w-[64px]' : 'w-[240px]',
          className
        )}
        {...props}
      >
        <div className="flex flex-col flex-1 gap-1 p-2 overflow-y-auto no-scrollbar">
          {children}
        </div>
      </nav>
    );
  }
);
EzSidebarNavigator.displayName = 'EzSidebarNavigator';

export interface EzSidebarButtonProps extends HTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  collapsed?: boolean;
  icon?: React.ReactNode;
  label: string;
  onClick?: () => void;
  /** Renders the item as non-interactive with a dimmed look and an "Em breve" badge. */
  disabled?: boolean;
}

export const EzSidebarButton = forwardRef<HTMLButtonElement, EzSidebarButtonProps>(
  ({ active, collapsed, icon, label, disabled, onClick, className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        title={collapsed ? (disabled ? `${label} (Em breve)` : label) : undefined}
        disabled={disabled}
        aria-disabled={disabled}
        onClick={disabled ? undefined : onClick}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-[8px] transition-colors font-medium outline-none text-[14px]',
          active
            ? 'bg-brand-100 text-brand-700'
            : 'text-gray-700 hover:bg-gray-80 hover:text-gray-900',
          disabled && 'opacity-50 cursor-not-allowed hover:bg-transparent hover:text-gray-700',
          collapsed ? 'justify-center px-0' : 'justify-start',
          className
        )}
        {...props}
      >
        {icon && <span className={cn('flex shrink-0 items-center justify-center', collapsed ? 'w-6 h-6' : 'w-5 h-5')}>{icon}</span>}
        {!collapsed && <span className="truncate flex-1 text-left">{label}</span>}
        {!collapsed && disabled && (
          <span className="shrink-0 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500">
            Em breve
          </span>
        )}
      </button>
    );
  }
);
EzSidebarButton.displayName = 'EzSidebarButton';
