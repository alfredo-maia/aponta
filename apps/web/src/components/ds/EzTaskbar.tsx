import { HTMLAttributes, forwardRef, useEffect, useRef, useState } from 'react';
import { cn } from './utils';
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Trash2,
  MoreVertical,
  Plus,
  Save,
  X,
  Grid3x3,
  Settings,
  Paperclip,
  type LucideIcon,
} from 'lucide-react';

/**
 * Identifier of a Taskbar action/button. Accepts any of the well-known
 * Sankhya DS `snk-taskbar` button names (mapped to an icon + pt-BR label
 * below) or any custom string, which falls back to a generic icon.
 */
export type EzTaskbarButton = 'DIVIDER' | string;

export type EzTaskbarAction = {
  /** Label rendered for the action item. */
  label: string;
  /** Handler fired when the action item is clicked. */
  onClick: () => void;
};

export type EzTaskbarProps = Omit<HTMLAttributes<HTMLDivElement>, 'onClick'> & {
  /**
   * Ordered list of button identifiers to render (e.g. 'PREVIOUS', 'NEXT',
   * 'DIVIDER', 'CLONE', 'REMOVE', 'MORE_OPTIONS', 'INSERT', 'SAVE',
   * 'CANCEL', 'GRID_MODE', 'CONFIGURATOR'...). Use 'DIVIDER' to render a
   * vertical separator between groups of buttons.
   */
  buttons: EzTaskbarButton[];
  /**
   * Callback fired with the button identifier whenever an action button
   * (anything other than 'DIVIDER' or 'MORE_OPTIONS') is clicked.
   */
  onAction: (action: string) => void;
  /**
   * Items shown in the dropdown opened by the 'MORE_OPTIONS' button.
   */
  actionsList?: EzTaskbarAction[];
  /**
   * Button identifiers that should render disabled and not fire onAction.
   */
  disabledButtons?: string[];
  /**
   * Button identifier that should receive the primary (highlighted) style.
   */
  primaryButton?: string;
  /**
   * Aligns the buttons to the right of the taskbar. @default false (left)
   */
  alignRight?: boolean;
};

type ButtonConfig = {
  label: string;
  icon: LucideIcon;
};

const BUTTON_CONFIG: Record<string, ButtonConfig> = {
  PREVIOUS: { label: 'Anterior', icon: ChevronLeft },
  NEXT: { label: 'Próximo', icon: ChevronRight },
  CLONE: { label: 'Duplicar', icon: Copy },
  REMOVE: { label: 'Excluir', icon: Trash2 },
  INSERT: { label: 'Incluir', icon: Plus },
  SAVE: { label: 'Salvar', icon: Save },
  CANCEL: { label: 'Cancelar', icon: X },
  GRID_MODE: { label: 'Modo grade', icon: Grid3x3 },
  CONFIGURATOR: { label: 'Configurador', icon: Settings },
  ATTACH: { label: 'Anexar', icon: Paperclip },
};

const MORE_OPTIONS_CONFIG: ButtonConfig = { label: 'Mais opções', icon: MoreVertical };

/**
 * Aponta DS Taskbar (visual behavior inspired by Sankhya DS `snk-taskbar`).
 * A configurable bar of action buttons, driven entirely by generic React
 * props — no dependency on SnkApplication/DataUnit. Supports 'DIVIDER'
 * separators and a 'MORE_OPTIONS' button that opens a dropdown populated
 * from `actionsList`.
 */
export const EzTaskbar = forwardRef<HTMLDivElement, EzTaskbarProps>(
  (
    {
      buttons,
      onAction,
      actionsList = [],
      disabledButtons = [],
      primaryButton,
      alignRight = false,
      className,
      ...props
    },
    ref
  ) => {
    const [isMoreOptionsOpen, setIsMoreOptionsOpen] = useState(false);
    const moreOptionsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handleOutsideClick = (e: MouseEvent) => {
        if (moreOptionsRef.current && !moreOptionsRef.current.contains(e.target as Node)) {
          setIsMoreOptionsOpen(false);
        }
      };
      document.addEventListener('mousedown', handleOutsideClick);
      return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, []);

    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center gap-1',
          alignRight ? 'justify-end' : 'justify-start',
          className
        )}
        {...props}
      >
        {buttons.map((button, index) => {
          if (button === 'DIVIDER') {
            return (
              <span
                key={`divider-${index}`}
                role="separator"
                aria-orientation="vertical"
                className="w-px h-6 bg-gray-200 mx-1"
              />
            );
          }

          if (button === 'MORE_OPTIONS') {
            const { label, icon: Icon } = MORE_OPTIONS_CONFIG;
            return (
              <div key={`${button}-${index}`} className="relative inline-block" ref={moreOptionsRef}>
                <button
                  type="button"
                  aria-label={label}
                  aria-haspopup="menu"
                  aria-expanded={isMoreOptionsOpen}
                  onClick={() => setIsMoreOptionsOpen((prev) => !prev)}
                  className={cn(
                    'inline-flex items-center justify-center h-[36px] w-[36px] rounded-[8px] transition-colors',
                    'text-gray-500 hover:bg-gray-80 hover:text-gray-900',
                    'focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-200'
                  )}
                >
                  <Icon className="w-4 h-4" />
                </button>

                {isMoreOptionsOpen && (
                  <div
                    role="menu"
                    className="absolute z-50 mt-2 right-0 w-56 rounded-[12px] bg-white shadow-lg border border-gray-100 py-1 focus:outline-none origin-top-right"
                  >
                    {actionsList.map((action, actionIndex) => (
                      <button
                        key={`${action.label}-${actionIndex}`}
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          action.onClick();
                          setIsMoreOptionsOpen(false);
                        }}
                        className="flex w-full items-center px-4 py-2 text-[14px] font-medium text-gray-700 hover:bg-gray-80 hover:text-gray-900 transition-colors text-left"
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          const config = BUTTON_CONFIG[button];
          const label = config?.label ?? button;
          const Icon = config?.icon ?? Settings;
          const isDisabled = disabledButtons.includes(button);
          const isPrimary = primaryButton === button;

          return (
            <button
              key={`${button}-${index}`}
              type="button"
              aria-label={label}
              title={label}
              disabled={isDisabled}
              onClick={() => onAction(button)}
              className={cn(
                'inline-flex items-center justify-center h-[36px] w-[36px] rounded-[8px] transition-colors',
                'focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-200',
                isPrimary
                  ? 'bg-brand-500 text-gray-70 hover:bg-brand-700'
                  : 'text-gray-500 hover:bg-gray-80 hover:text-gray-900',
                isDisabled && 'opacity-50 cursor-not-allowed pointer-events-none'
              )}
            >
              <Icon className="w-4 h-4" />
            </button>
          );
        })}
      </div>
    );
  }
);

EzTaskbar.displayName = 'EzTaskbar';
