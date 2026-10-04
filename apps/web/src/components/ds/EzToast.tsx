import { HTMLAttributes, forwardRef, ReactNode } from 'react';
import { cn } from './utils';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export interface EzToastProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Semantic variant of the toast.
   * @default 'info'
   */
  variant?: 'success' | 'warning' | 'error' | 'info';
  /**
   * Main title.
   */
  title: string;
  /**
   * Subtitle or description.
   */
  description?: ReactNode;
  /**
   * Close callback.
   */
  onClose?: () => void;
  /**
   * Whether it's currently entering or leaving for animation purposes.
   * @default true
   */
  visible?: boolean;
}

/**
 * Aponta DS Toast
 * Use this inside a Toast Provider (e.g. react-hot-toast or custom portal).
 */
export const EzToast = forwardRef<HTMLDivElement, EzToastProps>(
  ({ variant = 'info', title, description, onClose, visible = true, className, ...props }, ref) => {
    const config = {
      success: {
        iconColor: 'text-green-600',
        Icon: CheckCircle2,
      },
      warning: {
        iconColor: 'text-yellow-600',
        Icon: AlertTriangle,
      },
      error: {
        iconColor: 'text-red-600',
        Icon: AlertCircle,
      },
      info: {
        iconColor: 'text-ocean-600',
        Icon: Info,
      },
    }[variant];

    const DefaultIcon = config.Icon;

    return (
      <div
        ref={ref}
        className={cn(
          'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-[12px] bg-white p-4 shadow-lg ring-1 ring-black/5 transition-all duration-300',
          visible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-2 opacity-0 scale-95',
          className
        )}
        {...props}
      >
        <div className={cn('shrink-0 mt-0.5', config.iconColor)}>
          <DefaultIcon className="w-5 h-5" />
        </div>
        
        <div className="flex flex-1 flex-col justify-center pt-0.5">
          <p className="text-[14px] font-semibold text-gray-900">{title}</p>
          {description && <div className="mt-1 text-[13px] text-gray-500 font-medium">{description}</div>}
        </div>

        {onClose && (
          <div className="ml-4 flex shrink-0">
            <button
              onClick={onClose}
              className="inline-flex rounded-md bg-white text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-ocean-200"
            >
              <span className="sr-only">Close</span>
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    );
  }
);

EzToast.displayName = 'EzToast';
