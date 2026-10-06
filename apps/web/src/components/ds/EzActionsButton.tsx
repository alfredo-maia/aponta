import {
  ButtonHTMLAttributes,
  forwardRef,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';
import { cn } from './utils';
import { ChevronDown } from 'lucide-react';

export interface EzActionsButtonAction {
  /**
   * Label of the secondary action (e.g. "Editar", "Excluir", "Duplicar").
   */
  label: ReactNode;
  /**
   * Optional icon rendered before the label.
   */
  icon?: ReactNode;
  /**
   * Handler fired when the action is clicked. The menu closes automatically.
   */
  onClick?: () => void;
  /**
   * Disables this specific action.
   */
  disabled?: boolean;
  /**
   * Applies destructive (red) styling, e.g. for "Excluir".
   */
  danger?: boolean;
}

export interface EzActionsButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'title'> {
  /**
   * Text label of the main trigger button.
   */
  label?: string;
  /**
   * List of secondary actions displayed in the dropdown menu.
   */
  actions: EzActionsButtonAction[];
  /**
   * Alignment of the dropdown menu relative to the trigger.
   * @default 'right'
   */
  align?: 'left' | 'right';
}

/**
 * Aponta DS Actions Button (inspired by @sankhyalabs/ezui)
 * A button that opens a dropdown menu with secondary actions (Editar/Excluir/Duplicar).
 */
export const EzActionsButton = forwardRef<HTMLButtonElement, EzActionsButtonProps>(
  ({ label = 'Ações', actions, align = 'right', className, disabled, ...props }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handleOutsideClick = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setIsOpen(false);
        }
      };
      document.addEventListener('mousedown', handleOutsideClick);
      return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, []);

    return (
      <div className="relative inline-block text-left" ref={containerRef}>
        <button
          ref={ref}
          type="button"
          disabled={disabled}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((prev) => !prev)}
          className={cn(
            'inline-flex items-center gap-2 h-[42px] px-4 rounded-[12px] border text-[14px] font-medium transition-colors',
            'bg-transparent text-brand-600 border-gray-200 hover:bg-gray-80 hover:border-gray-90',
            'focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-200',
            disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
            className
          )}
          {...props}
        >
          <span>{label}</span>
          <ChevronDown className={cn('w-4 h-4 transition-transform', isOpen && 'rotate-180')} />
        </button>

        {isOpen && !disabled && (
          <div
            role="menu"
            className={cn(
              'absolute z-50 mt-2 w-56 rounded-[12px] bg-white shadow-lg border border-gray-100 py-1 focus:outline-none',
              align === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left'
            )}
          >
            {actions.map((action, idx) => (
              <button
                key={idx}
                type="button"
                role="menuitem"
                disabled={action.disabled}
                onClick={() => {
                  if (action.disabled) return;
                  action.onClick?.();
                  setIsOpen(false);
                }}
                className={cn(
                  'flex w-full items-center px-4 py-2 text-[14px] font-medium transition-colors',
                  action.disabled
                    ? 'text-gray-300 cursor-not-allowed'
                    : action.danger
                    ? 'text-red-700 hover:bg-red-100'
                    : 'text-gray-700 hover:bg-gray-80 hover:text-gray-900'
                )}
              >
                {action.icon && (
                  <span className="mr-2 w-4 h-4 shrink-0 flex items-center justify-center">
                    {action.icon}
                  </span>
                )}
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }
);

EzActionsButton.displayName = 'EzActionsButton';
