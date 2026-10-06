import { ReactNode } from 'react';
import { cn } from './utils';
import { Inbox, LucideIcon } from 'lucide-react';

export interface EzEmptyCardProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EzEmptyCard({ icon: Icon = Inbox, title, description, action, className }: EzEmptyCardProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-[24px] border border-gray-200 bg-gray-80 px-6 py-10 text-center',
        className
      )}
    >
      <Icon className="h-10 w-10 text-gray-400" />
      <div className="text-[15px] font-semibold text-gray-900">{title}</div>
      {description && <div className="max-w-sm text-[13px] text-gray-500">{description}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
