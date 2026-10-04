import { HTMLAttributes, forwardRef } from 'react';
import { cn } from './utils';

export interface EzTabItem {
  id: string | number;
  label: string;
  disabled?: boolean;
}

export interface EzTabsProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  tabs: EzTabItem[];
  activeTab: string | number;
  onChange: (tabId: string | number) => void;
  /**
   * The variant style.
   * @default 'line'
   */
  variant?: 'line' | 'pills';
}

/**
 * Aponta DS Tabs (Tabselector)
 */
export const EzTabs = forwardRef<HTMLDivElement, EzTabsProps>(
  ({ tabs, activeTab, onChange, variant = 'line', className, role, ...props }, ref) => {
    const resolvedRole = role ?? 'tablist';
    const tabRole = resolvedRole === 'tablist' ? 'tab' : undefined;
    return (
      <div
        ref={ref}
        role={resolvedRole}
        className={cn(
          'flex items-center overflow-x-auto no-scrollbar',
          variant === 'line' ? 'border-b border-gray-200' : 'gap-2',
          className
        )}
        {...props}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          const tabAriaProps = tabRole
            ? {
                role: tabRole,
                'aria-selected': isActive,
              }
            : {};

          if (variant === 'pills') {
            return (
              <button
                key={tab.id}
                type="button"
                disabled={tab.disabled}
                onClick={() => !tab.disabled && onChange(tab.id)}
                {...tabAriaProps}
                className={cn(
                  'px-4 py-2 rounded-full text-[14px] font-medium transition-colors whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-brand-200',
                  isActive
                    ? 'bg-brand-100 text-brand-700'
                    : 'text-gray-600 hover:bg-gray-90',
                  tab.disabled && 'opacity-50 cursor-not-allowed hover:bg-transparent'
                )}
              >
                {tab.label}
              </button>
            );
          }

          // Line variant
          return (
            <button
              key={tab.id}
              type="button"
              disabled={tab.disabled}
              onClick={() => !tab.disabled && onChange(tab.id)}
              {...tabAriaProps}
              className={cn(
                'relative px-4 py-3 text-[14px] font-medium transition-colors whitespace-nowrap outline-none focus-visible:bg-gray-80',
                isActive
                  ? 'text-brand-600'
                  : 'text-gray-500 hover:text-gray-900',
                tab.disabled && 'opacity-50 cursor-not-allowed hover:text-gray-500'
              )}
            >
              {tab.label}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600 rounded-t-sm" />
              )}
            </button>
          );
        })}
      </div>
    );
  }
);

EzTabs.displayName = 'EzTabs';
