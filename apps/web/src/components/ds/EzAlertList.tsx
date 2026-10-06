import { HTMLAttributes, forwardRef } from 'react';
import { cn } from './utils';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export interface EzAlertListItem {
  /**
   * Unique identifier of the alert, used as React key and for removal callbacks.
   */
  id: string | number;
  /**
   * Semantic variant of the alert.
   */
  variant: 'success' | 'warning' | 'error' | 'info';
  /**
   * Message displayed inside the alert.
   */
  message: string;
}

export interface EzAlertListProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Stack of alerts/notifications to render.
   */
  items: EzAlertListItem[];
  /**
   * Called with the alert id when its close (X) button is clicked.
   */
  onDismiss?: (id: string | number) => void;
}

const variantConfig = {
  success: {
    bg: 'bg-green-100',
    border: 'border-green-200',
    text: 'text-green-800',
    iconColor: 'text-green-600',
    Icon: CheckCircle2,
  },
  warning: {
    bg: 'bg-yellow-100',
    border: 'border-yellow-300',
    text: 'text-yellow-800',
    iconColor: 'text-yellow-600',
    Icon: AlertTriangle,
  },
  error: {
    bg: 'bg-red-100',
    border: 'border-red-200',
    text: 'text-red-800',
    iconColor: 'text-red-600',
    Icon: AlertCircle,
  },
  info: {
    bg: 'bg-petroleum-100',
    border: 'border-petroleum-200',
    text: 'text-petroleum-800',
    iconColor: 'text-petroleum-600',
    Icon: Info,
  },
} as const;

/**
 * Aponta DS Alert List (inspired by @sankhyalabs/ezui)
 * Renders a vertically stacked list of alert/notification banners.
 */
export const EzAlertList = forwardRef<HTMLDivElement, EzAlertListProps>(
  ({ items, onDismiss, className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('flex w-full flex-col gap-2', className)} {...props}>
        {items.map((item) => {
          const config = variantConfig[item.variant];
          const Icon = config.Icon;

          return (
            <div
              key={item.id}
              role="alert"
              className={cn(
                'relative flex w-full items-start gap-3 p-4 rounded-[12px] border transition-colors',
                config.bg,
                config.border,
                config.text
              )}
            >
              <div className={cn('shrink-0 mt-0.5', config.iconColor)}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 text-[14px] font-medium leading-relaxed">
                {item.message}
              </div>
              {onDismiss && (
                <button
                  type="button"
                  onClick={() => onDismiss(item.id)}
                  aria-label="Fechar"
                  className={cn(
                    'shrink-0 p-1 rounded-md transition-colors hover:bg-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-gray-900/20',
                    config.iconColor
                  )}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    );
  }
);

EzAlertList.displayName = 'EzAlertList';
