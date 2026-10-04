import { HTMLAttributes, forwardRef, ReactNode } from 'react';
import { cn } from './utils';
import { EzCardItem } from './EzCardItem';

export interface EzTileProps extends HTMLAttributes<HTMLDivElement> {
  icon?: ReactNode;
  label: string;
  value?: string | number;
  description?: string;
  /** Background color variant for the icon */
  iconVariant?: 'ocean' | 'gray' | 'green' | 'yellow' | 'red' | 'petroleum';
}

/**
 * Aponta DS Tile
 * A small data card ideal for dashboards (e.g. "Total Tickets: 12").
 */
export const EzTile = forwardRef<HTMLDivElement, EzTileProps>(
  ({ icon, label, value, description, iconVariant = 'ocean', className, ...props }, ref) => {
    const iconColors = {
      ocean: 'bg-ocean-100 text-ocean-600',
      gray: 'bg-gray-100 text-gray-600',
      green: 'bg-green-100 text-green-600',
      yellow: 'bg-yellow-100 text-yellow-600',
      red: 'bg-red-100 text-red-600',
      petroleum: 'bg-petroleum-100 text-petroleum-600',
    }[iconVariant];

    return (
      <EzCardItem
        ref={ref}
        className={cn('p-4 sm:p-5 flex items-center gap-4 flex-row', className)}
        {...props}
      >
        {icon && (
          <div className={cn('flex items-center justify-center shrink-0 w-12 h-12 rounded-[12px]', iconColors)}>
            {icon}
          </div>
        )}
        <div className="flex flex-col flex-1 overflow-hidden">
          <span className="text-[14px] font-medium text-gray-500 truncate">{label}</span>
          <div className="flex items-baseline gap-2 mt-0.5">
            {value !== undefined && <span className="text-[24px] font-bold text-gray-900 leading-none">{value}</span>}
            {description && <span className="text-[12px] font-medium text-gray-500 truncate">{description}</span>}
          </div>
        </div>
      </EzCardItem>
    );
  }
);
EzTile.displayName = 'EzTile';