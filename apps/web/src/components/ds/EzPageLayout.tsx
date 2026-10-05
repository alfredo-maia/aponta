import { HTMLAttributes, forwardRef, ReactNode } from 'react';
import { cn } from './utils';
import { LayoutList, AppWindow, ArrowLeft } from 'lucide-react';

export interface EzPageHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title: ReactNode;
  breadcrumbs?: ReactNode;
  actions?: ReactNode;
  /** Modo ativo atual da tela */
  activeMode?: 'list' | 'form';
  /** Callback para alternar entre os modos */
  onModeChange?: (mode: 'list' | 'form') => void;
  /** Mostra botão de voltar (ideal para modo form quando não há dual-view side by side) */
  showBackButton?: boolean;
  onBack?: () => void;
}

/**
 * Aponta DS Page Header
 * Puxando o padrão visual do ERP (Alternância Modo Lista / Modo Formulário)
 */
export const EzPageHeader = forwardRef<HTMLDivElement, EzPageHeaderProps>(
  ({ title, breadcrumbs, actions, activeMode, onModeChange, showBackButton, onBack, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col w-full bg-white border-b border-gray-200 px-6 py-4 gap-3',
          className
        )}
        {...props}
      >
        {breadcrumbs && <div>{breadcrumbs}</div>}
        
        <div className="flex items-center justify-between min-h-[40px]">
          <div className="flex items-center gap-3">
            {showBackButton && (
              <button
                onClick={onBack}
                className="p-1.5 -ml-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-80 rounded-md transition-colors"
                title="Voltar"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <h1 className="text-[20px] font-semibold text-gray-900 leading-none m-0">
              {title}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {actions && <div className="flex items-center gap-2">{actions}</div>}

            {activeMode && onModeChange && (
              <div className="flex items-center bg-gray-90 p-1 rounded-[8px] border border-gray-200">
                <button
                  onClick={() => onModeChange('list')}
                  className={cn(
                    'p-1.5 rounded-[6px] transition-colors',
                    activeMode === 'list' 
                      ? 'bg-white text-brand-600 shadow-sm border border-gray-200' 
                      : 'text-gray-500 hover:text-gray-900 border border-transparent'
                  )}
                  title="Modo Lista"
                >
                  <LayoutList className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onModeChange('form')}
                  className={cn(
                    'p-1.5 rounded-[6px] transition-colors',
                    activeMode === 'form' 
                      ? 'bg-white text-brand-600 shadow-sm border border-gray-200' 
                      : 'text-gray-500 hover:text-gray-900 border border-transparent'
                  )}
                  title="Modo Formulário"
                >
                  <AppWindow className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);
EzPageHeader.displayName = 'EzPageHeader';

export interface EzPageLayoutProps extends HTMLAttributes<HTMLDivElement> {
  header?: ReactNode;
}

export const EzPageLayout = forwardRef<HTMLDivElement, EzPageLayoutProps>(
  ({ header, className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('flex flex-col h-full bg-gray-80', className)} {...props}>
        {header}
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </div>
    );
  }
);
EzPageLayout.displayName = 'EzPageLayout';
